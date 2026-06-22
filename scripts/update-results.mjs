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
    match_id: 'ARG-ALG',
    home: 'Argentina',
    away: 'Algeria',
    home_score: 3,
    away_score: 0,
    outcome: '1',
    status: 'finished',
    finished: true
  },
  {
    match_id: 'AUS-GIOR',
    home: 'Austria',
    away: 'Jordan',
    home_score: 3,
    away_score: 1,
    outcome: '1',
    status: 'finished',
    finished: true
  },
  {
    match_id: 'AUS-TUR',
    home: 'Australia',
    away: 'Turkey',
    home_score: 2,
    away_score: 0,
    outcome: '1',
    status: 'finished',
    finished: true
  },
  {
    match_id: 'BEL-EGI',
    home: 'Belgium',
    away: 'Egypt',
    home_score: 1,
    away_score: 1,
    outcome: 'X',
    status: 'finished',
    finished: true
  },
  {
    match_id: 'BRA-HAI',
    home: 'Brazil',
    away: 'Haiti',
    home_score: 3,
    away_score: 0,
    outcome: '1',
    status: 'finished',
    finished: true
  },
  {
    match_id: 'BRA-MAR',
    home: 'Brazil',
    away: 'Morocco',
    home_score: 1,
    away_score: 1,
    outcome: 'X',
    status: 'finished',
    finished: true
  },
  {
    match_id: 'CAN-BOS',
    home: 'Canada',
    away: 'Bosnia and Herzegovina',
    home_score: 1,
    away_score: 1,
    outcome: 'X',
    status: 'finished',
    finished: true
  },
  {
    match_id: 'CAN-QAT',
    home: 'Canada',
    away: 'Qatar',
    home_score: 6,
    away_score: 0,
    outcome: '1',
    status: 'finished',
    finished: true
  },
  {
    match_id: 'CAV-ECU',
    home: 'Ivory Coast',
    away: 'Ecuador',
    home_score: 1,
    away_score: 0,
    outcome: '1',
    status: 'finished',
    finished: true
  },
  {
    match_id: 'CEC-SUD',
    home: 'Czech Republic',
    away: 'South Africa',
    home_score: 1,
    away_score: 1,
    outcome: 'X',
    status: 'finished',
    finished: true
  },
  {
    match_id: 'COR-CEC',
    home: 'South Korea',
    away: 'Czech Republic',
    home_score: 2,
    away_score: 1,
    outcome: '1',
    status: 'finished',
    finished: true
  },
  {
    match_id: 'FRA-SEN',
    home: 'France',
    away: 'Senegal',
    home_score: 3,
    away_score: 1,
    outcome: '1',
    status: 'finished',
    finished: true
  },
  {
    match_id: 'GER-CAV',
    home: 'Germany',
    away: 'Ivory Coast',
    home_score: 2,
    away_score: 1,
    outcome: '1',
    status: 'finished',
    finished: true
  },
  {
    match_id: 'GER-CURA',
    home: 'Germany',
    away: 'Curaçao',
    home_score: 7,
    away_score: 1,
    outcome: '1',
    status: 'finished',
    finished: true
  },
  {
    match_id: 'GHA-PAN',
    home: 'Ghana',
    away: 'Panama',
    home_score: 1,
    away_score: 0,
    outcome: '1',
    status: 'finished',
    finished: true
  },
  {
    match_id: 'HAI-SCO',
    home: 'Haiti',
    away: 'Scotland',
    home_score: 0,
    away_score: 1,
    outcome: '2',
    status: 'finished',
    finished: true
  },
  {
    match_id: 'ING-CROA',
    home: 'England',
    away: 'Croatia',
    home_score: 4,
    away_score: 2,
    outcome: '1',
    status: 'finished',
    finished: true
  },
  {
    match_id: 'IRAN-NZEL',
    home: 'Iran',
    away: 'New Zealand',
    home_score: 2,
    away_score: 2,
    outcome: 'X',
    status: 'finished',
    finished: true
  },
  {
    match_id: 'IRAQ-NOR',
    home: 'Iraq',
    away: 'Norway',
    home_score: 1,
    away_score: 4,
    outcome: '2',
    status: 'finished',
    finished: true
  },
  {
    match_id: 'MEX-COR',
    home: 'Mexico',
    away: 'South Korea',
    home_score: 1,
    away_score: 0,
    outcome: '1',
    status: 'finished',
    finished: true
  },
  {
    match_id: 'MEX-SUD',
    home: 'Mexico',
    away: 'South Africa',
    home_score: 2,
    away_score: 0,
    outcome: '1',
    status: 'finished',
    finished: true
  },
  {
    match_id: 'NED-JAP',
    home: 'Netherlands',
    away: 'Japan',
    home_score: 2,
    away_score: 2,
    outcome: 'X',
    status: 'finished',
    finished: true
  },
  {
    match_id: 'NED-SVE',
    home: 'Netherlands',
    away: 'Sweden',
    home_score: 5,
    away_score: 1,
    outcome: '1',
    status: 'finished',
    finished: true
  },
  {
    match_id: 'POR-CONGO',
    home: 'Portugal',
    away: 'Democratic Republic of the Congo',
    home_score: 1,
    away_score: 1,
    outcome: 'X',
    status: 'finished',
    finished: true
  },
  {
    match_id: 'QAT-SVIZ',
    home: 'Qatar',
    away: 'Switzerland',
    home_score: 1,
    away_score: 1,
    outcome: 'X',
    status: 'finished',
    finished: true
  },
  {
    match_id: 'SAUDI-URU',
    home: 'Saudi Arabia',
    away: 'Uruguay',
    home_score: 1,
    away_score: 1,
    outcome: 'X',
    status: 'finished',
    finished: true
  },
  {
    match_id: 'SCO-MAR',
    home: 'Scotland',
    away: 'Morocco',
    home_score: 0,
    away_score: 1,
    outcome: '2',
    status: 'finished',
    finished: true
  },
  {
    match_id: 'SPA-CAVE',
    home: 'Spain',
    away: 'Cape Verde',
    home_score: 0,
    away_score: 0,
    outcome: 'X',
    status: 'finished',
    finished: true
  },
  {
    match_id: 'SVE-TUN',
    home: 'Sweden',
    away: 'Tunisia',
    home_score: 5,
    away_score: 1,
    outcome: '1',
    status: 'finished',
    finished: true
  },
  {
    match_id: 'SVI-BOS',
    home: 'Switzerland',
    away: 'Bosnia and Herzegovina',
    home_score: 4,
    away_score: 1,
    outcome: '1',
    status: 'finished',
    finished: true
  },
  {
    match_id: 'TUR-PAR',
    home: 'Turkey',
    away: 'Paraguay',
    home_score: 0,
    away_score: 1,
    outcome: '2',
    status: 'finished',
    finished: true
  },
  {
    match_id: 'USA-AUS',
    home: 'United States',
    away: 'Australia',
    home_score: 2,
    away_score: 0,
    outcome: '1',
    status: 'finished',
    finished: true
  },
  {
    match_id: 'USA-PAR',
    home: 'United States',
    away: 'Paraguay',
    home_score: 4,
    away_score: 1,
    outcome: '1',
    status: 'finished',
    finished: true
  },
  {
    match_id: 'UZB-COL',
    home: 'Uzbekistan',
    away: 'Colombia',
    home_score: 1,
    away_score: 3,
    outcome: '2',
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

function stripAccents(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeText(value) {
  return stripAccents(value).toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
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
        map.set(makeTeamKey(home, away), { match_id: matchId, reverse: false });
        map.set(makeTeamKey(away, home), { match_id: matchId, reverse: true });
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
  const outcome = finished ? outcomeFromScore(homeScore, awayScore) : null;
  return { home, away, homeScore, awayScore, finished, outcome };
}

async function main() {
  const predictions = JSON.parse(await fs.readFile(PREDICTIONS_FILE, 'utf8'));
  const matchMap = buildMatchMap(predictions);

  const response = await fetch(API_URL, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`API HTTP ${response.status}`);

  const payload = await response.json();
  const games = extractArray(payload);
  const results = [];
  const seen = new Set();

  for (const raw of games) {
    const game = normalizeGame(raw);
    if (!game.home || !game.away || !game.finished || !game.outcome) continue;

    const match = matchMap.get(makeTeamKey(game.home, game.away));
    if (!match || seen.has(match.match_id)) continue;

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

  const output = {
    updated_at: new Date().toISOString(),
    source: API_URL,
    source_status: 'ok',
    results
  };

  await fs.writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2) + '\n', 'utf8');
  console.log(`Aggiornati ${results.length} risultati conclusi.`);
}

main().catch(async error => {
  console.error(error);
  const fallback = {
    updated_at: new Date().toISOString(),
    source: API_URL,
    source_status: 'error',
    error: String(error.message || error),
    results: []
  };
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(fallback, null, 2) + '\n', 'utf8');
  process.exitCode = 1;
});
