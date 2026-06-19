import fs from 'node:fs/promises';

const API_URL = 'https://worldcup26.ir/get/games';
const PREDICTIONS_FILE = 'data/pronostici.json';
const OUTPUT_FILE = 'data/risultati-auto.json';

const TEAM_NAMES = {
  MEX: ['Mexico'],
  SUD: ['South Africa'],
  COR: ['Korea Republic', 'South Korea'],
  CEC: ['Czech Republic', 'Czechia'],
  CAN: ['Canada'],
  BOS: ['Bosnia and Herzegovina', 'Bosnia'],
  USA: ['United States', 'USA', 'United States of America'],
  PAR: ['Paraguay'],
  QAT: ['Qatar'],
  SVI: ['Switzerland'],
  SVIZ: ['Switzerland'],
  BRA: ['Brazil'],
  MAR: ['Morocco'],
  HAI: ['Haiti'],
  SCO: ['Scotland'],
  AUS: ['Australia', 'Austria'],
  TUR: ['Turkiye', 'Turkey'],
  GER: ['Germany'],
  CURA: ['Curacao', 'Curaçao'],
  CUR: ['Curacao', 'Curaçao'],
  NED: ['Netherlands'],
  JAP: ['Japan'],
  CAV: ['Ivory Coast', "Cote d'Ivoire", 'Côte d’Ivoire'],
  ECU: ['Ecuador'],
  SVE: ['Sweden'],
  TUN: ['Tunisia'],
  SPA: ['Spain'],
  CAVE: ['Cape Verde', 'Cabo Verde'],
  BEL: ['Belgium'],
  EGI: ['Egypt'],
  SAUDI: ['Saudi Arabia'],
  URU: ['Uruguay'],
  IRAN: ['Iran'],
  NZEL: ['New Zealand'],
  FRA: ['France'],
  SEN: ['Senegal'],
  IRAQ: ['Iraq'],
  NOR: ['Norway'],
  ARG: ['Argentina'],
  ALG: ['Algeria'],
  GIOR: ['Jordan'],
  POR: ['Portugal'],
  CONGO: ['DR Congo', 'Congo DR', 'Democratic Republic of the Congo'],
  ING: ['England'],
  CROA: ['Croatia'],
  GHA: ['Ghana'],
  PAN: ['Panama'],
  UZB: ['Uzbekistan'],
  COL: ['Colombia']
};



const MANUAL_FINISHED_RESULTS = [
  {
    match_id: 'AUS-TUR',
    home: 'Australia',
    away: 'Turkey',
    home_score: 2,
    away_score: 0,
    outcome: '1',
    status: 'finished',
    finished: true
  }
];

const OVERRIDE_MATCH_NAMES = {
  'AUS-TUR': ['Australia', 'Turkiye'],
  'USA-AUS': ['United States', 'Australia'],
  'PAR-AUS': ['Paraguay', 'Australia'],
  'AUS-GIOR': ['Austria', 'Jordan'],
  'ARG-AUS': ['Argentina', 'Austria'],
  'ALG-AUS': ['Algeria', 'Austria']
};

const TEAM_FLAGS = {
  ALGERIA: 'dz',
  ARGENTINA: 'ar',
  AUSTRALIA: 'au',
  AUSTRIA: 'at',
  BELGIUM: 'be',
  'BOSNIA AND HERZEGOVINA': 'ba',
  BOSNIA: 'ba',
  BRAZIL: 'br',
  CANADA: 'ca',
  'CAPE VERDE': 'cv',
  'CABO VERDE': 'cv',
  COLOMBIA: 'co',
  CROATIA: 'hr',
  CURACAO: 'cw',
  CZECHIA: 'cz',
  'CZECH REPUBLIC': 'cz',
  'DR CONGO': 'cd',
  'CONGO DR': 'cd',
  ECUADOR: 'ec',
  EGYPT: 'eg',
  ENGLAND: 'gb-eng',
  FRANCE: 'fr',
  GERMANY: 'de',
  GHANA: 'gh',
  HAITI: 'ht',
  IRAN: 'ir',
  IRAQ: 'iq',
  'IVORY COAST': 'ci',
  JAPAN: 'jp',
  JORDAN: 'jo',
  'KOREA REPUBLIC': 'kr',
  'SOUTH KOREA': 'kr',
  MEXICO: 'mx',
  MOROCCO: 'ma',
  NETHERLANDS: 'nl',
  'NEW ZEALAND': 'nz',
  NORWAY: 'no',
  PANAMA: 'pa',
  PARAGUAY: 'py',
  PORTUGAL: 'pt',
  QATAR: 'qa',
  SAUDI: 'sa',
  'SAUDI ARABIA': 'sa',
  SCOTLAND: 'gb-sct',
  SENEGAL: 'sn',
  'SOUTH AFRICA': 'za',
  SPAIN: 'es',
  SWEDEN: 'se',
  SWITZERLAND: 'ch',
  TUNISIA: 'tn',
  TURKEY: 'tr',
  TURKIYE: 'tr',
  URUGUAY: 'uy',
  'UNITED STATES': 'us',
  USA: 'us',
  UZBEKISTAN: 'uz'
};

function stripAccents(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeText(value) {
  return stripAccents(value).toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
}

function flagForTeam(teamName) {
  return TEAM_FLAGS[normalizeText(teamName)] || '';
}

function makeTeamKey(home, away) {
  return `${normalizeText(home)}|${normalizeText(away)}`;
}

function invertOutcome(outcome) {
  if (outcome === '1') return '2';
  if (outcome === '2') return '1';
  return outcome;
}

function possibleNamesForCode(code) {
  return TEAM_NAMES[code] || [code];
}

function buildMatchMap(predictions) {
  const uniqueIds = [...new Set(predictions.map(p => String(p.match_id || '').trim().toUpperCase()).filter(Boolean))];
  const map = new Map();

  for (const matchId of uniqueIds) {
    let homeNames;
    let awayNames;

    if (OVERRIDE_MATCH_NAMES[matchId]) {
      [homeNames, awayNames] = [[OVERRIDE_MATCH_NAMES[matchId][0]], [OVERRIDE_MATCH_NAMES[matchId][1]]];
    } else {
      const [homeCode, awayCode] = matchId.split('-');
      homeNames = possibleNamesForCode(homeCode);
      awayNames = possibleNamesForCode(awayCode);
    }

    for (const home of homeNames) {
      for (const away of awayNames) {
        map.set(makeTeamKey(home, away), { match_id: matchId, reverse: false, order: uniqueIds.indexOf(matchId) });
        map.set(makeTeamKey(away, home), { match_id: matchId, reverse: true, order: uniqueIds.indexOf(matchId) });
      }
    }
  }

  return map;
}

function firstDefined(...values) {
  return values.find(v => v !== undefined && v !== null && v !== '');
}

function extractArray(response) {
  if (Array.isArray(response)) return response;
  return firstDefined(response.games, response.data, response.matches, response.results, response.items, []);
}

function scoreValue(value) {
  const raw = firstDefined(value?.current, value?.total, value?.goals, value?.score, value);
  if (raw === undefined || raw === null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function parseDateValue(value) {
  if (value === undefined || value === null || value === '') return null;

  if (typeof value === 'number') {
    const millis = value > 1000000000000 ? value : value * 1000;
    return Number.isFinite(millis) ? millis : null;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const numeric = Number(raw);
  if (Number.isFinite(numeric) && raw.length >= 10) {
    return numeric > 1000000000000 ? numeric : numeric * 1000;
  }

  const parsed = Date.parse(raw);
  if (!Number.isNaN(parsed)) return parsed;

  const italian = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (italian) {
    const [, day, month, year, hour = '0', minute = '0'] = italian;
    const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
    return Number.isNaN(date.getTime()) ? null : date.getTime();
  }

  return null;
}

function localDateParts(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!match) return null;

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4] || 0),
    minute: Number(match[5] || 0),
    second: Number(match[6] || 0)
  };
}

function uniqueFiniteTimes(values) {
  return [...new Set(values.filter(value => Number.isFinite(value)))];
}

function parseDateCandidates(value) {
  if (value === undefined || value === null || value === '') return [];

  const candidates = [];
  const parsed = parseDateValue(value);
  if (parsed !== null) candidates.push(parsed);

  const parts = localDateParts(value);
  if (parts) {
    const { year, month, day, hour, minute, second } = parts;
    const utcBase = Date.UTC(year, month - 1, day, hour, minute, second);

    // L'API non dichiara sempre il fuso orario dei campi local_date/date.
    // Per evitare che una partita in corso resti nascosta, proviamo alcune
    // interpretazioni comuni: UTC, Italia, costa Est USA e Iran.
    candidates.push(utcBase);
    candidates.push(utcBase - 2 * 60 * 60 * 1000);       // Europe/Rome ora legale
    candidates.push(utcBase + 4 * 60 * 60 * 1000);       // America/New_York EDT
    candidates.push(utcBase - 3.5 * 60 * 60 * 1000);     // Iran Standard Time
  }

  return uniqueFiniteTimes(candidates);
}

function kickoffTimeCandidates(raw) {
  const values = [
    raw.kickoff, raw.kickoff_time, raw.kickoffTime, raw.start_time, raw.startTime,
    raw.match_date, raw.matchDate, raw.datetime, raw.date_time, raw.utcDate,
    raw.local_date, raw.localDate, raw.local_datetime, raw.localDatetime,
    raw.date, raw.fixture?.date, raw.fixture?.timestamp, raw.timestamp
  ];

  const datePart = firstDefined(raw.local_date, raw.localDate, raw.date, raw.match_date, raw.matchDate, raw.day);
  const timePart = firstDefined(raw.local_time, raw.localTime, raw.start_hour, raw.startHour, raw.hour, raw.kickoff_hour, raw.kickoffHour, raw.time);
  if (datePart && timePart && !String(datePart).includes(':')) {
    values.push(`${datePart} ${timePart}`);
  }

  return uniqueFiniteTimes(values.flatMap(parseDateCandidates));
}

function kickoffTime(raw) {
  return kickoffTimeCandidates(raw)[0] ?? null;
}

function isProbablyLiveByScore(raw, homeScore, awayScore) {
  const hasScore = homeScore !== null || awayScore !== null;
  if (!hasScore) return false;

  const elapsed = String(firstDefined(raw.time_elapsed, raw.elapsed, raw.minute, raw.match_minute, '')).trim().toLowerCase();
  return !['notstarted', 'not started', 'scheduled', ''].includes(elapsed);
}

function isProbablyLiveByKickoff(raw) {
  const now = Date.now();
  const startWindowMs = 30 * 60 * 1000;
  const endWindowMs = 150 * 60 * 1000;

  return kickoffTimeCandidates(raw).some(time => {
    return now >= time - startWindowMs && now <= time + endWindowMs;
  });
}

function isFinished(raw) {
  const values = [
    raw.finished, raw.is_finished, raw.completed, raw.isCompleted, raw.played, raw.isPlayed,
    raw.status, raw.match_status, raw.state, raw.status_en, raw.fixture?.status?.short, raw.fixture?.status?.long
  ];
  return values.some(value => {
    const s = String(value ?? '').trim().toLowerCase();
    return ['true', '1', 'yes', 'finished', 'full_time', 'full time', 'ft', 'ended', 'completed', 'complete', 'final', 'played'].includes(s)
      || s.includes('finished') || s.includes('ended') || s.includes('full');
  });
}

function isLive(raw) {
  const values = [
    raw.live, raw.is_live, raw.in_play, raw.isInPlay,
    raw.status, raw.match_status, raw.state, raw.status_en, raw.fixture?.status?.short, raw.fixture?.status?.long
  ];

  return values.some(value => {
    const s = String(value ?? '').trim().toLowerCase();
    return ['live', 'in_play', 'in play', 'playing', '1h', '2h', 'ht', 'halftime'].includes(s)
      || s.includes('live') || s.includes('play') || s.includes('half');
  });
}

function matchMinute(raw, game) {
  if (game.finished) return 'FT';

  const value = firstDefined(
    raw.minute, raw.elapsed, raw.match_minute, raw.time, raw.fixture?.status?.elapsed
  );
  const n = Number(value);

  if (Number.isFinite(n) && n > 0) return `${n}'`;
  return game.live ? 'Live' : '';
}

function outcomeFromScore(homeScore, awayScore) {
  if (homeScore === null || awayScore === null) return null;
  if (homeScore > awayScore) return '1';
  if (homeScore < awayScore) return '2';
  return 'X';
}

function teamName(raw, side) {
  return firstDefined(
    raw[`${side}_team_name_en`], raw[`${side}_team_name`], raw[`${side}_team`], raw[`${side}TeamName`], raw[`${side}Team`],
    raw[side]?.name_en, raw[side]?.name, raw[side]?.team_name, raw[side]?.team,
    raw.teams?.[side]?.name_en, raw.teams?.[side]?.name, raw.teams?.[side]?.team,
    raw[`${side}_name`]
  );
}

function teamCode(raw, side) {
  return firstDefined(
    raw[`${side}_team_code`], raw[`${side}_team_fifa_code`], raw[`${side}TeamCode`],
    raw[side]?.fifa_code, raw[side]?.code, raw.teams?.[side]?.fifa_code, raw.teams?.[side]?.code
  );
}

function normalizeGame(raw) {
  const home = firstDefined(teamName(raw, 'home'), teamCode(raw, 'home'));
  const away = firstDefined(teamName(raw, 'away'), teamCode(raw, 'away'));
  const homeScore = scoreValue(firstDefined(raw.home_score, raw.homeScore, raw.home_goals, raw.homeGoals, raw.score_home, raw.home_team_score, raw.homeTeamScore, raw.home?.score, raw.home?.goals, raw.goals?.home, raw.score?.home, raw.result?.home, raw.result?.home_score));
  const awayScore = scoreValue(firstDefined(raw.away_score, raw.awayScore, raw.away_goals, raw.awayGoals, raw.score_away, raw.away_team_score, raw.awayTeamScore, raw.away?.score, raw.away?.goals, raw.goals?.away, raw.score?.away, raw.result?.away, raw.result?.away_score));
  const finished = isFinished(raw);
  const apiLive = isLive(raw);
  const fallbackLive = isProbablyLiveByScore(raw, homeScore, awayScore) || isProbablyLiveByKickoff(raw);
  const live = !finished && (apiLive || fallbackLive);
  const outcome = finished ? outcomeFromScore(homeScore, awayScore) : null;
  const minute = matchMinute(raw, { finished, live }) || (live ? 'In corso' : '');
  const kickoff_ts = kickoffTime(raw);
  return { home, away, homeScore, awayScore, finished, live, minute, outcome, kickoff_ts };
}

async function main() {
  const predictions = JSON.parse(await fs.readFile(PREDICTIONS_FILE, 'utf8'));
  const matchMap = buildMatchMap(predictions);

  let response;
let lastError;

for (let attempt = 1; attempt <= 5; attempt++) {
  try {
    response = await fetch(API_URL, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(30000)
    });

    if (response.ok) break;

    lastError = new Error(`API HTTP ${response.status}`);
  } catch (error) {
    lastError = error;
  }

  console.log(`Tentativo API ${attempt}/5 fallito: ${lastError?.message || lastError}`);

  if (attempt < 5) {
    await new Promise(resolve => setTimeout(resolve, attempt * 5000));
  }
}

if (!response || !response.ok) {
  throw lastError || new Error('API non raggiungibile');
}
  if (!response.ok) throw new Error(`API HTTP ${response.status}`);

  const payload = await response.json();
  const games = extractArray(payload);
  const results = [];
  const liveCandidates = [];
  const seen = new Set();
  const seenLive = new Set();

  for (const raw of games) {
    const game = normalizeGame(raw);
    if (!game.home || !game.away) continue;

    const match = matchMap.get(makeTeamKey(game.home, game.away));
    if (!match) continue;

    if (!seenLive.has(match.match_id) && (game.live || game.finished)) {
      seenLive.add(match.match_id);
      liveCandidates.push({
        match_id: match.match_id,
        home: game.home,
        away: game.away,
        home_flag: flagForTeam(game.home),
        away_flag: flagForTeam(game.away),
        home_score: game.live ? (game.homeScore ?? 0) : game.homeScore,
        away_score: game.live ? (game.awayScore ?? 0) : game.awayScore,
        minute: game.minute || (game.finished ? 'FT' : 'Live'),
        live: game.live,
        finished: game.finished,
        kickoff_ts: game.kickoff_ts,
        order: match.order
      });
    }

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
      finished: true
    });
  }

  for (const manual of MANUAL_FINISHED_RESULTS) {
    if (!seen.has(manual.match_id)) {
      seen.add(manual.match_id);
      results.push(manual);
    }
  }

  results.sort((a, b) => String(a.match_id).localeCompare(String(b.match_id), 'it'));

  const liveOnly = liveCandidates.filter(match => match.live);
  const finishedOnly = liveCandidates.filter(match => match.finished);
  const sourceForWidget = liveOnly.length ? liveOnly : finishedOnly;
  const liveMatches = sourceForWidget
    .slice()
    .sort((a, b) => {
      const timeA = a.kickoff_ts ?? null;
      const timeB = b.kickoff_ts ?? null;

      if (liveOnly.length) {
        if (timeA !== null && timeB !== null && timeA !== timeB) return timeA - timeB;
        if (timeA !== null && timeB === null) return -1;
        if (timeA === null && timeB !== null) return 1;
        return (a.order ?? 9999) - (b.order ?? 9999);
      }

      if (timeA !== null && timeB !== null && timeA !== timeB) return timeB - timeA;
      if (timeA !== null && timeB === null) return -1;
      if (timeA === null && timeB !== null) return 1;
      return (b.order ?? -1) - (a.order ?? -1);
    })
    .slice(0, 2)
    .map(({ home, away, home_flag, away_flag, home_score, away_score, minute }) => ({ home, away, home_flag, away_flag, home_score, away_score, minute }));

  const output = {
    updated_at: new Date().toISOString(),
    source: API_URL,
    source_status: 'ok',
    results,
    live_matches: liveMatches
  };

  await fs.writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2) + '\n', 'utf8');
  console.log(`Aggiornati ${results.length} risultati conclusi. Widget live: ${liveMatches.length} partite.`);
}

main().catch(async error => {
  console.error(error);
  const fallback = {
    updated_at: new Date().toISOString(),
    source: API_URL,
    source_status: 'error',
    error: String(error.message || error),
    results: [],
    live_matches: []
  };
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(fallback, null, 2) + '\n', 'utf8');
  process.exitCode = 1;
});
