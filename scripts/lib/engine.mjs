import fs from 'node:fs/promises';
import { PREDICTIONS_FILE, OUTPUT_FILE, MANUAL_FINISHED_RESULTS } from './config.mjs';
import { buildMatchMap } from './match-map.mjs';
import { loadGamesFromSources, sourceIsUsable } from './sources.mjs';
import { normalizeGame } from './normalizers.mjs';
import { scheduledKickoff, isLiveByScheduledKickoff } from './schedule.mjs';
import { flagForTeam, makeTeamKey, invertOutcome } from './utils.mjs';
import { makeLiveWidgetMatches } from './live-widget.mjs';
import { DATA_SOURCES } from './config.mjs';

export async function readExistingOutput() {
  try {
    return JSON.parse(await fs.readFile(OUTPUT_FILE, 'utf8'));
  } catch {
    return null;
  }
}

async function main() {
  const predictions = JSON.parse(await fs.readFile(PREDICTIONS_FILE, 'utf8'));
  const matchMap = buildMatchMap(predictions);
  const previous = await readExistingOutput();

  let loaded;
  try {
    loaded = await loadGamesFromSources();
  } catch (error) {
    console.error(error);
    if (previous?.results?.length || previous?.live_matches?.length) {
      const fallback = {
        ...previous,
        updated_at: new Date().toISOString(),
        source_status: 'fallback_cache',
        error: String(error.message || error)
      };
      await fs.writeFile(OUTPUT_FILE, JSON.stringify(fallback, null, 2) + '\n', 'utf8');
      console.log('API non disponibili: mantenuti ultimi dati validi in cache.');
      return;
    }
    throw error;
  }

  const { source, games } = loaded;
  const results = [];
  const allMatches = [];
  const seen = new Set();

  for (const raw of games) {
    const game = normalizeGame(raw, source.type);
    if (!game.home || !game.away) continue;

    const match = matchMap.get(makeTeamKey(game.home, game.away));
    if (!match) continue;

    const scheduled_ts = scheduledKickoff(match.match_id);
    const kickoff_ts = scheduled_ts ?? game.kickoff_ts ?? null;
    const scheduledLive = !game.finished && isLiveByScheduledKickoff(match.match_id);
    const live = scheduled_ts !== null ? scheduledLive : game.live;
    const isUpcoming = !game.finished && !live;

    const common = {
      match_id: match.match_id,
      home: game.home,
      away: game.away,
      home_flag: flagForTeam(game.home),
      away_flag: flagForTeam(game.away),
      homeScore: isUpcoming ? null : game.homeScore,
      awayScore: isUpcoming ? null : game.awayScore,
      minute: game.finished ? 'FT' : (live ? (game.minute || 'Live') : 'Prossima'),
      live,
      finished: game.finished,
      kickoff_ts,
      order: match.order
    };

    allMatches.push(common);

    if (!game.finished || !game.outcome || seen.has(match.match_id)) continue;

    seen.add(match.match_id);
    results.push({
      match_id: match.match_id,
      home: game.home,
      away: game.away,
      home_score: game.homeScore,
      away_score: game.awayScore,
      outcome: match.reverse ? invertOutcome(game.outcome) : game.outcome,
      status: 'finished',
      finished: true,
      kickoff_ts,
      order: match.order
    });
  }

  for (const manual of MANUAL_FINISHED_RESULTS) {
    if (!seen.has(manual.match_id)) {
      seen.add(manual.match_id);
      const order = matchMap.get(makeTeamKey(manual.home, manual.away))?.order ?? 9999;
      results.push({ ...manual, order });
    }
  }

  // Protezione anti-azzeramento:
  // se una sorgente alternativa restituisce meno partite della precedente,
  // manteniamo i risultati già validi presenti nel JSON esistente.
  if (Array.isArray(previous?.results)) {
    for (const row of previous.results) {
      const matchId = String(row.match_id || '').trim().toUpperCase();
      if (!matchId || seen.has(matchId)) continue;

      seen.add(matchId);
      const order = matchMap.get(makeTeamKey(row.home, row.away))?.order ?? row.order ?? 9999;
      results.push({
        ...row,
        match_id: matchId,
        order,
        status: 'finished',
        finished: true
      });
    }
  }

  results.sort((a, b) => String(a.match_id).localeCompare(String(b.match_id), 'it'));

  const resultsByMatch = new Map(results.map(row => [row.match_id, row]));
  const liveMatches = makeLiveWidgetMatches(allMatches, resultsByMatch);

  const output = {
    updated_at: new Date().toISOString(),
    source: source.url,
    source_name: source.name,
    source_status: 'ok',
    available_sources: DATA_SOURCES.map(s => ({ name: s.name, requires_secret: Boolean(s.tokenEnv), enabled: sourceIsUsable(s) })),
    results,
    live_matches: liveMatches
  };

  await fs.writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2) + '\n', 'utf8');
  console.log(`Aggiornati ${results.length} risultati conclusi da ${source.name}.`);
}

export async function run() {
  try {
    await main();
  } catch (error) {
    console.error(error);
      const previous = await readExistingOutput();
      const fallback = previous || {
        updated_at: new Date().toISOString(),
        source_status: 'error',
        results: [],
        live_matches: []
      };
    
      fallback.updated_at = new Date().toISOString();
      fallback.source_status = previous ? 'fallback_cache' : 'error';
      fallback.error = String(error.message || error);
      await fs.writeFile(OUTPUT_FILE, JSON.stringify(fallback, null, 2) + '\n', 'utf8');
      console.log('Errore gestito senza bloccare il workflow.');
  }
}
