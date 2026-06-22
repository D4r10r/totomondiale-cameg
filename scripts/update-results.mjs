import fs from 'node:fs/promises';

const DATA_SOURCES = [
  {
    name: 'worldcup26.ir',
    url: 'https://worldcup26.ir/get/games',
    type: 'worldcup26'
  },
  {
    name: 'TheSportsDB',
    url: 'https://www.thesportsdb.com/api/v1/json/3/eventsseason.php?id=4429&s=2026',
    type: 'thesportsdb'
  },
  {
    name: 'GitHub raw worldcup2026 dataset',
    url: 'https://raw.githubusercontent.com/rezarahiminia/worldcup2026/main/worldcup2026.games.json',
    type: 'generic'
  },
  {
    name: 'football-data.org',
    url: 'https://api.football-data.org/v4/competitions/WC/matches?season=2026',
    type: 'football-data',
    tokenEnv: 'FOOTBALL_DATA_TOKEN'
  },
  {
    name: 'API-Football',
    url: 'https://v3.football.api-sports.io/fixtures?league=1&season=2026',
    type: 'api-football',
    tokenEnv: 'API_FOOTBALL_KEY'
  }
];

const PREDICTIONS_FILE = 'data/pronostici.json';
const OUTPUT_FILE = 'data/risultati-auto.json';
const MAX_FETCH_ATTEMPTS = 3;
const FETCH_TIMEOUT_MS = 25000;
const LIVE_BEFORE_KICKOFF_MS = 10 * 60 * 1000;
const LIVE_AFTER_KICKOFF_MS = 150 * 60 * 1000;
const RECENT_FINISHED_WINDOW_MS = 2 * 60 * 60 * 1000;


const MATCH_KICKOFF_UTC = {
  'MEX-SUD': '2026-06-11T19:00:00Z',
  'COR-CEC': '2026-06-12T02:00:00Z',
  'CAN-BOS': '2026-06-12T19:00:00Z',
  'USA-PAR': '2026-06-13T01:00:00Z',
  'QAT-SVI': '2026-06-13T19:00:00Z',
  'BRA-MAR': '2026-06-13T22:00:00Z',
  'HAI-SCO': '2026-06-14T01:00:00Z',
  'AUS-TUR': '2026-06-14T04:00:00Z',
  'GER-CURA': '2026-06-14T17:00:00Z',
  'NED-JAP': '2026-06-14T20:00:00Z',
  'CAV-ECU': '2026-06-14T23:00:00Z',
  'SVE-TUN': '2026-06-15T02:00:00Z',
  'SPA-CAVE': '2026-06-15T16:00:00Z',
  'BEL-EGI': '2026-06-15T19:00:00Z',
  'SAUDI-URU': '2026-06-15T22:00:00Z',
  'IRAN-NZEL': '2026-06-16T01:00:00Z',
  'FRA-SEN': '2026-06-16T19:00:00Z',
  'IRAQ-NOR': '2026-06-16T22:00:00Z',
  'ARG-ALG': '2026-06-17T01:00:00Z',
  'AUS-GIOR': '2026-06-17T04:00:00Z',
  'POR-CONGO': '2026-06-17T17:00:00Z',
  'ING-CROA': '2026-06-17T20:00:00Z',
  'GHA-PAN': '2026-06-17T23:00:00Z',
  'UZB-COL': '2026-06-18T02:00:00Z',
  'CEC-SUD': '2026-06-18T16:00:00Z',
  'SVI-BOS': '2026-06-18T19:00:00Z',
  'CAN-QAT': '2026-06-18T22:00:00Z',
  'MEX-COR': '2026-06-19T01:00:00Z',
  'USA-AUS': '2026-06-19T19:00:00Z',
  'SCO-MAR': '2026-06-19T22:00:00Z',
  'BRA-HAI': '2026-06-20T00:30:00Z',
  'TUR-PAR': '2026-06-20T03:00:00Z',
  'NED-SVE': '2026-06-20T17:00:00Z',
  'GER-CAV': '2026-06-20T20:00:00Z',
  'ECU-CURA': '2026-06-21T00:00:00Z',
  'TUN-JAP': '2026-06-21T04:00:00Z',
  'SPA-SAUDI': '2026-06-21T16:00:00Z',
  'BEL-IRAN': '2026-06-21T19:00:00Z',
  'URU-CAVE': '2026-06-21T22:00:00Z',
  'NZEL-EGI': '2026-06-22T01:00:00Z',
  'ARG-AUS': '2026-06-22T17:00:00Z',
  'FRA-IRAQ': '2026-06-22T21:00:00Z',
  'NOR-SEN': '2026-06-23T00:00:00Z',
  'GIOR-ALG': '2026-06-23T03:00:00Z',
  'POR-UZB': '2026-06-23T17:00:00Z',
  'ING-GHA': '2026-06-23T20:00:00Z',
  'PAN-CROA': '2026-06-23T23:00:00Z',
  'COL-CONGO': '2026-06-24T02:00:00Z',
  'SVI-CAN': '2026-06-24T19:00:00Z',
  'BOS-QAT': '2026-06-24T19:00:00Z',
  'SCO-BRA': '2026-06-24T22:00:00Z',
  'MAR-HAI': '2026-06-24T22:00:00Z',
  'CEC-MEX': '2026-06-25T01:00:00Z',
  'SUD-COR': '2026-06-25T01:00:00Z',
  'ECU-GER': '2026-06-25T20:00:00Z',
  'CURA-CAV': '2026-06-25T20:00:00Z',
  'TUN-NED': '2026-06-25T23:00:00Z',
  'JAP-SVE': '2026-06-25T23:00:00Z',
  'TUR-USA': '2026-06-26T02:00:00Z',
  'PAR-AUS': '2026-06-26T02:00:00Z',
  'NOR-FRA': '2026-06-26T19:00:00Z',
  'SEN-IRAQ': '2026-06-26T19:00:00Z',
  'URU-SPA': '2026-06-27T00:00:00Z',
  'CAVE-SAUDI': '2026-06-27T00:00:00Z',
  'NZEL-BEL': '2026-06-27T03:00:00Z',
  'EGI-IRAN': '2026-06-27T03:00:00Z',
  'PAN-ING': '2026-06-27T21:00:00Z',
  'CROA-GHA': '2026-06-27T21:00:00Z',
  'COL-POR': '2026-06-27T23:30:00Z',
  'CONGO-UZB': '2026-06-27T23:30:00Z',
  'GIOR-ARG': '2026-06-28T02:00:00Z',
  'ALG-AUS': '2026-06-28T02:00:00Z'
};

function scheduledKickoff(matchId) {
  const value = MATCH_KICKOFF_UTC[String(matchId || '').trim().toUpperCase()];
  if (!value) return null;
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : null;
}

function isLiveByScheduledKickoff(matchId, now = Date.now()) {
  const ts = scheduledKickoff(matchId);
  return ts !== null && now >= ts - LIVE_BEFORE_KICKOFF_MS && now <= ts + LIVE_AFTER_KICKOFF_MS;
}

const TEAM_NAMES = {
  MEX: ['Mexico'],
  SUD: ['South Africa', 'RSA'],
  COR: ['Korea Republic', 'South Korea', 'KOR'],
  CEC: ['Czech Republic', 'Czechia', 'CZE'],
  CAN: ['Canada'],
  BOS: ['Bosnia and Herzegovina', 'Bosnia', 'BIH'],
  USA: ['United States', 'USA', 'United States of America'],
  PAR: ['Paraguay'],
  QAT: ['Qatar'],
  SVI: ['Switzerland', 'SUI'],
  SVIZ: ['Switzerland', 'SUI'],
  BRA: ['Brazil'],
  MAR: ['Morocco'],
  HAI: ['Haiti', 'HTI'],
  SCO: ['Scotland'],
  AUS: ['Australia', 'Austria', 'AUS', 'AUT'],
  TUR: ['Turkiye', 'Turkey'],
  GER: ['Germany'],
  CURA: ['Curacao', 'Curaçao', 'CUW'],
  CUR: ['Curacao', 'Curaçao', 'CUW'],
  NED: ['Netherlands'],
  JAP: ['Japan', 'JPN'],
  CAV: ['Ivory Coast', "Cote d'Ivoire", 'Côte d’Ivoire', 'CIV'],
  ECU: ['Ecuador'],
  SVE: ['Sweden', 'SWE'],
  TUN: ['Tunisia'],
  SPA: ['Spain', 'ESP'],
  CAVE: ['Cape Verde', 'Cabo Verde', 'CPV'],
  BEL: ['Belgium'],
  EGI: ['Egypt', 'EGY'],
  SAUDI: ['Saudi Arabia', 'KSA'],
  URU: ['Uruguay'],
  IRAN: ['Iran', 'IRI'],
  NZEL: ['New Zealand', 'NZL'],
  FRA: ['France'],
  SEN: ['Senegal'],
  IRAQ: ['Iraq', 'IRQ'],
  NOR: ['Norway'],
  ARG: ['Argentina'],
  ALG: ['Algeria', 'DZA'],
  GIOR: ['Jordan', 'JOR'],
  POR: ['Portugal'],
  CONGO: ['DR Congo', 'Congo DR', 'Democratic Republic of the Congo', 'COD'],
  ING: ['England', 'ENG'],
  CROA: ['Croatia', 'CRO'],
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
  ALGERIA: 'dz', ARGENTINA: 'ar', AUSTRALIA: 'au', AUSTRIA: 'at', BELGIUM: 'be',
  'BOSNIA AND HERZEGOVINA': 'ba', BOSNIA: 'ba', BRAZIL: 'br', CANADA: 'ca',
  'CAPE VERDE': 'cv', 'CABO VERDE': 'cv', COLOMBIA: 'co', CROATIA: 'hr', CURACAO: 'cw',
  CZECHIA: 'cz', 'CZECH REPUBLIC': 'cz', 'DR CONGO': 'cd', 'CONGO DR': 'cd', ECUADOR: 'ec',
  EGYPT: 'eg', ENGLAND: 'gb-eng', FRANCE: 'fr', GERMANY: 'de', GHANA: 'gh', HAITI: 'ht',
  IRAN: 'ir', IRAQ: 'iq', 'IVORY COAST': 'ci', JAPAN: 'jp', JORDAN: 'jo',
  'KOREA REPUBLIC': 'kr', 'SOUTH KOREA': 'kr', MEXICO: 'mx', MOROCCO: 'ma',
  NETHERLANDS: 'nl', 'NEW ZEALAND': 'nz', NORWAY: 'no', PANAMA: 'pa', PARAGUAY: 'py',
  PORTUGAL: 'pt', QATAR: 'qa', SAUDI: 'sa', 'SAUDI ARABIA': 'sa', SCOTLAND: 'gb-sct',
  SENEGAL: 'sn', 'SOUTH AFRICA': 'za', SPAIN: 'es', SWEDEN: 'se', SWITZERLAND: 'ch',
  TUNISIA: 'tn', TURKEY: 'tr', TURKIYE: 'tr', URUGUAY: 'uy', 'UNITED STATES': 'us',
  USA: 'us', UZBEKISTAN: 'uz'
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

function sourceHeaders(source) {
  const headers = { accept: 'application/json' };
  if (source.name === 'football-data.org' && process.env.FOOTBALL_DATA_TOKEN) {
    headers['X-Auth-Token'] = process.env.FOOTBALL_DATA_TOKEN;
  }
  if (source.name === 'API-Football' && process.env.API_FOOTBALL_KEY) {
    headers['x-apisports-key'] = process.env.API_FOOTBALL_KEY;
  }
  return headers;
}

function sourceIsUsable(source) {
  return !source.tokenEnv || Boolean(process.env[source.tokenEnv]);
}

async function fetchJsonFromSource(source) {
  if (!sourceIsUsable(source)) {
    throw new Error(`Sorgente saltata: manca secret ${source.tokenEnv}`);
  }

  let lastError = null;

  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(source.url, {
        headers: sourceHeaders(source),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      console.log(`${source.name}: tentativo ${attempt}/${MAX_FETCH_ATTEMPTS} fallito: ${error?.message || error}`);
      if (attempt < MAX_FETCH_ATTEMPTS) await new Promise(resolve => setTimeout(resolve, attempt * 3000));
    }
  }

  throw lastError || new Error('Fetch fallito');
}

function extractArray(payload, sourceType) {
  if (Array.isArray(payload)) return payload;
  if (sourceType === 'thesportsdb') return payload?.events || [];
  if (sourceType === 'football-data') return payload?.matches || [];
  if (sourceType === 'api-football') return payload?.response || [];
  return firstDefined(payload.games, payload.data, payload.matches, payload.results, payload.items, payload.events, payload.response, []);
}

function scoreValue(value) {
  const raw = firstDefined(value?.current, value?.total, value?.goals, value?.score, value);
  if (raw === undefined || raw === null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function hasExplicitTimezone(raw) {
  return /(?:Z|[+-]\d{2}:?\d{2})$/i.test(String(raw).trim());
}

function parseDateValueCandidates(value) {
  if (value === undefined || value === null || value === '') return [];

  if (typeof value === 'number') {
    const millis = value > 1000000000000 ? value : value * 1000;
    return Number.isFinite(millis) ? [millis] : [];
  }

  const raw = String(value).trim();
  if (!raw) return [];

  const numeric = Number(raw);
  if (Number.isFinite(numeric) && raw.length >= 10) {
    return [numeric > 1000000000000 ? numeric : numeric * 1000];
  }

  const normalized = raw.replace(' ', 'T');
  const direct = Date.parse(raw);
  if (!Number.isNaN(direct) && hasExplicitTimezone(raw)) return [direct];

  const out = [];
  const utc = Date.parse(`${normalized.replace(/Z$/i, '')}Z`);
  if (!Number.isNaN(utc)) {
    out.push(utc);
    out.push(utc + 4 * 60 * 60 * 1000); // EDT fallback for USA/Canada/Mexico local times in June.
    out.push(utc + 5 * 60 * 60 * 1000); // EST fallback.
  } else if (!Number.isNaN(direct)) {
    out.push(direct);
  }

  const italian = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (italian) {
    const [, day, month, year, hour = '0', minute = '0'] = italian;
    const base = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
    out.push(base, base + 4 * 60 * 60 * 1000, base + 5 * 60 * 60 * 1000);
  }

  return [...new Set(out)].filter(Number.isFinite);
}

function kickoffCandidates(raw, sourceType) {
  const direct = firstDefined(
    raw.kickoff, raw.kickoff_time, raw.kickoffTime, raw.start_time, raw.startTime,
    raw.match_date, raw.matchDate, raw.datetime, raw.date_time, raw.utcDate,
    raw.local_date, raw.localDate, raw.dateEventLocal,
    raw.date, raw.fixture?.date, raw.fixture?.timestamp, raw.timestamp,
    raw.strTimestamp
  );

  const directCandidates = parseDateValueCandidates(direct);
  if (directCandidates.length) return directCandidates;

  if (sourceType === 'thesportsdb') {
    const date = firstDefined(raw.dateEvent, raw.dateEventLocal);
    const time = firstDefined(raw.strTime, raw.strTimeLocal);
    return parseDateValueCandidates(date && time ? `${date} ${time}` : date);
  }

  const datePart = firstDefined(raw.date, raw.match_date, raw.matchDate, raw.day, raw.dateEvent);
  const timePart = firstDefined(raw.start_hour, raw.startHour, raw.hour, raw.kickoff_hour, raw.kickoffHour, raw.strTime);
  return parseDateValueCandidates(datePart && timePart ? `${datePart} ${timePart}` : datePart);
}

function bestKickoff(candidates, now = Date.now()) {
  if (!candidates.length) return null;
  const inWindow = candidates.find(ts => now >= ts - LIVE_BEFORE_KICKOFF_MS && now <= ts + LIVE_AFTER_KICKOFF_MS);
  if (inWindow) return inWindow;
  const future = candidates.filter(ts => ts > now).sort((a, b) => a - b)[0];
  if (future) return future;
  return candidates.slice().sort((a, b) => b - a)[0];
}

function isFinishedStatus(...values) {
  return values.some(value => {
    const s = String(value ?? '').trim().toLowerCase();
    return ['true', '1', 'yes', 'finished', 'full_time', 'full time', 'ft', 'ended', 'completed', 'complete', 'final', 'played', 'match finished'].includes(s)
      || s.includes('finished') || s.includes('ended') || s.includes('full time');
  });
}

function isLiveStatus(...values) {
  return values.some(value => {
    const s = String(value ?? '').trim().toLowerCase();
    return ['live', 'in_play', 'in play', 'playing', '1h', '2h', 'ht', 'halftime', 'first half', 'second half'].includes(s)
      || s.includes('live') || s.includes('in play') || s.includes('first half') || s.includes('second half');
  });
}

function outcomeFromScore(homeScore, awayScore) {
  if (homeScore === null || awayScore === null) return null;
  if (homeScore > awayScore) return '1';
  if (homeScore < awayScore) return '2';
  return 'X';
}

function normalizeWorldcup26Game(raw) {
  const home = firstDefined(teamName(raw, 'home'), teamCode(raw, 'home'));
  const away = firstDefined(teamName(raw, 'away'), teamCode(raw, 'away'));
  const homeScore = scoreValue(firstDefined(raw.home_score, raw.homeScore, raw.home_goals, raw.homeGoals, raw.score_home, raw.home_team_score, raw.homeTeamScore, raw.home?.score, raw.home?.goals, raw.goals?.home, raw.score?.home, raw.result?.home, raw.result?.home_score));
  const awayScore = scoreValue(firstDefined(raw.away_score, raw.awayScore, raw.away_goals, raw.awayGoals, raw.score_away, raw.away_team_score, raw.awayTeamScore, raw.away?.score, raw.away?.goals, raw.goals?.away, raw.score?.away, raw.result?.away, raw.result?.away_score));
  const finished = isFinishedStatus(raw.finished, raw.is_finished, raw.completed, raw.isCompleted, raw.played, raw.isPlayed, raw.status, raw.match_status, raw.state, raw.status_en, raw.fixture?.status?.short, raw.fixture?.status?.long);
  const explicitLive = !finished && isLiveStatus(raw.live, raw.is_live, raw.in_play, raw.isInPlay, raw.status, raw.match_status, raw.state, raw.status_en, raw.fixture?.status?.short, raw.fixture?.status?.long);
  const kickoff_ts_candidates = kickoffCandidates(raw, 'worldcup26');
  const kickoff_ts = bestKickoff(kickoff_ts_candidates);
  const liveByTime = !finished && kickoff_ts_candidates.some(ts => Date.now() >= ts - LIVE_BEFORE_KICKOFF_MS && Date.now() <= ts + LIVE_AFTER_KICKOFF_MS);
  const live = explicitLive || liveByTime;
  const minute = matchMinute(raw, { finished, live });
  const outcome = finished ? outcomeFromScore(homeScore, awayScore) : null;
  return { home, away, homeScore, awayScore, finished, live, minute, outcome, kickoff_ts };
}

function normalizeTheSportsDbGame(raw) {
  const home = firstDefined(raw.strHomeTeam, raw.strHomeTeamShort, raw.homeTeam, raw.home);
  const away = firstDefined(raw.strAwayTeam, raw.strAwayTeamShort, raw.awayTeam, raw.away);
  const homeScore = scoreValue(firstDefined(raw.intHomeScore, raw.home_score, raw.homeScore));
  const awayScore = scoreValue(firstDefined(raw.intAwayScore, raw.away_score, raw.awayScore));
  const status = firstDefined(raw.strStatus, raw.status, raw.strProgress);
  const finished = isFinishedStatus(status) || (homeScore !== null && awayScore !== null && String(status || '').toLowerCase().includes('match finished'));
  const explicitLive = !finished && isLiveStatus(status, raw.strProgress);
  const kickoff_ts_candidates = kickoffCandidates(raw, 'thesportsdb');
  const kickoff_ts = bestKickoff(kickoff_ts_candidates);
  const liveByTime = !finished && kickoff_ts_candidates.some(ts => Date.now() >= ts - LIVE_BEFORE_KICKOFF_MS && Date.now() <= ts + LIVE_AFTER_KICKOFF_MS);
  const live = explicitLive || liveByTime;
  const minute = finished ? 'FT' : (explicitLive ? 'Live' : (liveByTime ? 'Live' : ''));
  const outcome = finished ? outcomeFromScore(homeScore, awayScore) : null;
  return { home, away, homeScore, awayScore, finished, live, minute, outcome, kickoff_ts };
}

function normalizeFootballDataGame(raw) {
  const home = firstDefined(raw.homeTeam?.name, raw.homeTeam?.shortName, raw.homeTeam?.tla);
  const away = firstDefined(raw.awayTeam?.name, raw.awayTeam?.shortName, raw.awayTeam?.tla);
  const homeScore = scoreValue(firstDefined(raw.score?.fullTime?.home, raw.score?.regularTime?.home, raw.score?.halfTime?.home));
  const awayScore = scoreValue(firstDefined(raw.score?.fullTime?.away, raw.score?.regularTime?.away, raw.score?.halfTime?.away));
  const status = raw.status;
  const finished = isFinishedStatus(status) || String(status || '').toUpperCase() === 'FINISHED';
  const explicitLive = !finished && ['IN_PLAY', 'PAUSED'].includes(String(status || '').toUpperCase());
  const kickoff_ts_candidates = kickoffCandidates(raw, 'football-data');
  const kickoff_ts = bestKickoff(kickoff_ts_candidates);
  const liveByTime = !finished && kickoff_ts_candidates.some(ts => Date.now() >= ts - LIVE_BEFORE_KICKOFF_MS && Date.now() <= ts + LIVE_AFTER_KICKOFF_MS);
  const live = explicitLive || liveByTime;
  const minute = finished ? 'FT' : (explicitLive ? 'Live' : (liveByTime ? 'Live' : ''));
  const outcome = finished ? outcomeFromScore(homeScore, awayScore) : null;
  return { home, away, homeScore, awayScore, finished, live, minute, outcome, kickoff_ts };
}

function normalizeApiFootballGame(raw) {
  const home = firstDefined(raw.teams?.home?.name, raw.home?.name);
  const away = firstDefined(raw.teams?.away?.name, raw.away?.name);
  const homeScore = scoreValue(firstDefined(raw.goals?.home, raw.score?.fulltime?.home, raw.score?.halftime?.home));
  const awayScore = scoreValue(firstDefined(raw.goals?.away, raw.score?.fulltime?.away, raw.score?.halftime?.away));
  const statusShort = raw.fixture?.status?.short;
  const statusLong = raw.fixture?.status?.long;
  const finished = ['FT', 'AET', 'PEN'].includes(String(statusShort || '').toUpperCase()) || isFinishedStatus(statusLong);
  const explicitLive = !finished && ['1H', '2H', 'HT', 'ET', 'BT', 'P'].includes(String(statusShort || '').toUpperCase());
  const kickoff_ts_candidates = kickoffCandidates(raw, 'api-football');
  const kickoff_ts = bestKickoff(kickoff_ts_candidates);
  const liveByTime = !finished && kickoff_ts_candidates.some(ts => Date.now() >= ts - LIVE_BEFORE_KICKOFF_MS && Date.now() <= ts + LIVE_AFTER_KICKOFF_MS);
  const live = explicitLive || liveByTime;
  const elapsed = Number(raw.fixture?.status?.elapsed);
  const minute = finished ? 'FT' : (Number.isFinite(elapsed) && elapsed > 0 ? `${elapsed}'` : (live ? 'Live' : ''));
  const outcome = finished ? outcomeFromScore(homeScore, awayScore) : null;
  return { home, away, homeScore, awayScore, finished, live, minute, outcome, kickoff_ts };
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

function matchMinute(raw, game) {
  if (game.finished) return 'FT';
  const value = firstDefined(raw.minute, raw.elapsed, raw.match_minute, raw.time, raw.fixture?.status?.elapsed);
  const n = Number(value);
  if (Number.isFinite(n) && n > 0) return `${n}'`;
  return game.live ? 'Live' : '';
}

function normalizeGame(raw, sourceType) {
  if (sourceType === 'thesportsdb') return normalizeTheSportsDbGame(raw);
  if (sourceType === 'football-data') return normalizeFootballDataGame(raw);
  if (sourceType === 'api-football') return normalizeApiFootballGame(raw);
  return normalizeWorldcup26Game(raw);
}

async function readExistingOutput() {
  try {
    return JSON.parse(await fs.readFile(OUTPUT_FILE, 'utf8'));
  } catch {
    return null;
  }
}

async function loadGamesFromSources() {
  const errors = [];

  for (const source of DATA_SOURCES) {
    try {
      const payload = await fetchJsonFromSource(source);
      const games = extractArray(payload, source.type);
      if (!Array.isArray(games) || !games.length) throw new Error('Payload senza partite utilizzabili');
      console.log(`Sorgente attiva: ${source.name} (${games.length} partite lette)`);
      return { source, games };
    } catch (error) {
      errors.push(`${source.name}: ${error?.message || error}`);
      console.log(`Sorgente non disponibile: ${source.name} - ${error?.message || error}`);
    }
  }

  throw new Error(`Nessuna sorgente disponibile. ${errors.join(' | ')}`);
}

function displayNamesForMatchId(matchId) {
  const id = String(matchId || '').trim().toUpperCase();

  if (OVERRIDE_MATCH_NAMES[id]) {
    return {
      home: OVERRIDE_MATCH_NAMES[id][0],
      away: OVERRIDE_MATCH_NAMES[id][1]
    };
  }

  const [homeCode, awayCode] = id.split('-');
  return {
    home: possibleNamesForCode(homeCode)[0] || homeCode,
    away: possibleNamesForCode(awayCode)[0] || awayCode
  };
}

function scheduledWidgetFixtures() {
  return Object.entries(MATCH_KICKOFF_UTC).map(([matchId, kickoff]) => {
    const names = displayNamesForMatchId(matchId);
    const kickoffTs = Date.parse(kickoff);

    return {
      match_id: matchId,
      home: names.home,
      away: names.away,
      homeScore: null,
      awayScore: null,
      home_flag: flagForTeam(names.home),
      away_flag: flagForTeam(names.away),
      minute: 'Prossima',
      finished: false,
      live: isLiveByScheduledKickoff(matchId),
      kickoff_ts: Number.isFinite(kickoffTs) ? kickoffTs : null,
      order: 9999
    };
  });
}

function normalizeWidgetMatch(match) {
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

function makeLiveWidgetMatches(allMatches, resultsByMatch) {
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

main().catch(async error => {
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
});
