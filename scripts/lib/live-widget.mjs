import { LIVE_AFTER_KICKOFF_MS, RECENT_FINISHED_WINDOW_MS } from './config.mjs';
import { flagForTeam } from './utils.mjs';
import { scheduledKickoff, scheduledWidgetFixtures } from './schedule.mjs';

export function normalizeWidgetMatch(match) {
  const homeScore = match.homeScore ?? match.home_score ?? '';
  const awayScore = match.awayScore ?? match.away_score ?? '';
  const isUpcoming = !match.finished && !match.live;

  return {
    home: match.home,
    away: match.away,
    home_flag: match.home_flag || flagForTeam(match.home),
    away_flag: match.away_flag || flagForTeam(match.away),
    home_score: isUpcoming ? '' : homeScore,
    away_score: isUpcoming ? '' : awayScore,
    minute: match.finished ? 'FT' : (match.live ? (match.minute || 'Live') : 'Prossima')
  };
}

export function makeLiveWidgetMatches(allMatches, resultsByMatch) {
  const now = Date.now();
  const byId = new Map();

  function upsert(match) {
    if (!match?.match_id) return;

    const matchId = String(match.match_id).trim().toUpperCase();
    const scheduledTs = scheduledKickoff(matchId);
    const kickoffTs = scheduledTs ?? match.kickoff_ts ?? null;
    const previous = byId.get(matchId);

    const normalized = {
      ...previous,
      ...match,
      match_id: matchId,
      kickoff_ts: kickoffTs,
      home_flag: match.home_flag || previous?.home_flag || flagForTeam(match.home || previous?.home),
      away_flag: match.away_flag || previous?.away_flag || flagForTeam(match.away || previous?.away),
      order: match.order ?? previous?.order ?? 9999
    };

    // Se una partita è già conclusa nei risultati validi, non farla degradare
    // a "Prossima" o "Live" per colpa di una sorgente alternativa incompleta.
    if (previous?.finished && !match.finished) {
      normalized.finished = true;
      normalized.live = false;
      normalized.minute = 'FT';
      normalized.homeScore = previous.homeScore ?? previous.home_score;
      normalized.awayScore = previous.awayScore ?? previous.away_score;
    }

    byId.set(matchId, normalized);
  }

  // Inserisce tutta la cronologia ufficiale, così le prossime partite non dipendono
  // dalla completezza della sorgente esterna usata in quel giro.
  for (const fixture of scheduledWidgetFixtures()) upsert(fixture);

  // Aggiorna con eventuali dati live/prossimi provenienti dalla sorgente attiva.
  for (const match of allMatches) upsert(match);

  // Aggiorna con i risultati conclusi validi.
  for (const row of resultsByMatch.values()) {
    upsert({
      match_id: row.match_id,
      home: row.home,
      away: row.away,
      homeScore: row.home_score,
      awayScore: row.away_score,
      home_flag: flagForTeam(row.home),
      away_flag: flagForTeam(row.away),
      minute: 'FT',
      finished: true,
      live: false,
      kickoff_ts: row.kickoff_ts ?? scheduledKickoff(row.match_id),
      order: row.order ?? 9999
    });
  }

  const matches = [...byId.values()].filter(match => match.kickoff_ts);

  const live = matches
    .filter(match => match.live && !match.finished)
    .sort((a, b) => a.kickoff_ts - b.kickoff_ts);

  // Una partita finita resta nel box per 2 ore dopo la fine stimata.
  const recentFinished = matches
    .filter(match => {
      if (!match.finished || !match.kickoff_ts) return false;
      const estimatedFinishedAt = match.kickoff_ts + LIVE_AFTER_KICKOFF_MS;
      return now >= estimatedFinishedAt && now <= estimatedFinishedAt + RECENT_FINISHED_WINDOW_MS;
    })
    .sort((a, b) => b.kickoff_ts - a.kickoff_ts);

  const upcoming = matches
    .filter(match => !match.live && !match.finished && match.kickoff_ts > now)
    .sort((a, b) => a.kickoff_ts - b.kickoff_ts);

  const olderFinished = matches
    .filter(match => match.finished)
    .sort((a, b) => b.kickoff_ts - a.kickoff_ts);

  const selected = [];
  for (const group of [live, recentFinished, upcoming, olderFinished]) {
    for (const item of group) {
      if (selected.length >= 2) break;
      if (!selected.some(match => match.match_id === item.match_id)) selected.push(item);
    }
    if (selected.length >= 2) break;
  }

  return selected.slice(0, 2).map(normalizeWidgetMatch);
}
