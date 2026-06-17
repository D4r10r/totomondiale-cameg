const CONFIG = {
  predictionsUrl: 'data/pronostici.json',
  matchesApiUrl: 'https://worldcup26.ir/get/games',
  refreshMs: 5 * 60 * 1000
};

const els = {
  updatedAt: document.getElementById('updatedAt'),
  rankingBody: document.getElementById('rankingBody'),
  summary: document.getElementById('summary'),
  reloadBtn: document.getElementById('reloadBtn'),
  dataStatus: document.getElementById('dataStatus')
};

const TEAM_ALIASES = {
  'MEXICO': ['MEX'],
  'SOUTH AFRICA': ['SUD'],
  'KOREA REPUBLIC': ['COR'],
  'SOUTH KOREA': ['COR'],
  'CZECH REPUBLIC': ['CEC'],
  'CZECHIA': ['CEC'],
  'CANADA': ['CAN'],
  'BOSNIA AND HERZEGOVINA': ['BOS'],
  'BOSNIA': ['BOS'],
  'UNITED STATES': ['USA'],
  'USA': ['USA'],
  'PARAGUAY': ['PAR'],
  'QATAR': ['QAT'],
  'SWITZERLAND': ['SVIZ', 'SVI'],
  'BRAZIL': ['BRA'],
  'MOROCCO': ['MAR'],
  'HAITI': ['HAI'],
  'SCOTLAND': ['SCO'],
  'AUSTRALIA': ['AUS'],
  'TURKEY': ['TUR'],
  'TURKIYE': ['TUR'],
  'ARGENTINA': ['ARG'],
  'ALGERIA': ['ALG'],
  'AUSTRIA': ['AUS'],
  'JORDAN': ['GIOR'],
  'GERMANY': ['GER'],
  'CURACAO': ['CURA', 'CUR'],
  'CURAÇAO': ['CURA', 'CUR'],
  'NETHERLANDS': ['NED'],
  'JAPAN': ['JAP'],
  'IVORY COAST': ['CAV'],
  'COTE D IVOIRE': ['CAV'],
  "COTE D'IVOIRE": ['CAV'],
  'ECUADOR': ['ECU'],
  'BELGIUM': ['BEL'],
  'EGYPT': ['EGI'],
  'IRAN': ['IRAN'],
  'SWEDEN': ['SVE'],
  'SPAIN': ['SPA'],
  'CAPE VERDE': ['CAVE'],
  'SAUDI ARABIA': ['SAUDI'],
  'NEW ZEALAND': ['NZEL'],
  'URUGUAY': ['URU'],
  'FRANCE': ['FRA'],
  'SENEGAL': ['SEN'],
  'NORWAY': ['NOR'],
  'IRAQ': ['IRAQ'],
  'PORTUGAL': ['POR'],
  'COLOMBIA': ['COL'],
  'UZBEKISTAN': ['UZB'],
  'CONGO DR': ['CONGO'],
  'DR CONGO': ['CONGO'],
  'DEMOCRATIC REPUBLIC OF THE CONGO': ['CONGO'],
  'ENGLAND': ['ING'],
  'CROATIA': ['CROA'],
  'GHANA': ['GHA'],
  'PANAMA': ['PAN']
};

function stripAccents(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeText(value) {
  return stripAccents(value).toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeSign(value) {
  const v = String(value || '').trim().toUpperCase();
  return ['1', 'X', '2'].includes(v) ? v : '';
}

function firstDefined(...values) {
  return values.find(v => v !== undefined && v !== null && v !== '');
}

function scoreValue(value) {
  const v = firstDefined(value?.current, value?.total, value);
  if (v === undefined || v === null || v === '' || String(v).toLowerCase() === 'null') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function truthyFinished(value) {
  const s = String(value ?? '').trim().toLowerCase();
  return ['true', '1', 'yes', 'y', 'finished', 'full_time', 'ft', 'ended', 'completed', 'final'].includes(s) || s.includes('finished');
}

function getOutcome(homeScore, awayScore) {
  if (homeScore === null || awayScore === null) return null;
  if (homeScore > awayScore) return '1';
  if (homeScore < awayScore) return '2';
  return 'X';
}

function getTeamAliases(teamName) {
  const normalized = normalizeText(teamName);
  if (!normalized) return [];
  if (TEAM_ALIASES[normalized]) return TEAM_ALIASES[normalized];

  const matched = Object.entries(TEAM_ALIASES)
    .find(([name]) => normalized.includes(name) || name.includes(normalized));

  return matched ? matched[1] : [normalized.slice(0, 4)];
}

function makeMatchKeys(homeName, awayName) {
  const keys = [];
  for (const h of getTeamAliases(homeName)) {
    for (const a of getTeamAliases(awayName)) {
      keys.push(`${h}-${a}`);
    }
  }
  return keys;
}

function normalizeApiMatch(raw) {
  const home = firstDefined(
    raw.home_team_name_en,
    raw.home_team,
    raw.homeTeam,
    raw.home_team_name,
    raw.home?.name_en,
    raw.home?.name,
    raw.home?.team,
    raw.team_home,
    raw.home_name,
    raw.homeTeamName,
    raw.teams?.home?.name,
    raw.homeTeam?.name
  );

  const away = firstDefined(
    raw.away_team_name_en,
    raw.away_team,
    raw.awayTeam,
    raw.away_team_name,
    raw.away?.name_en,
    raw.away?.name,
    raw.away?.team,
    raw.team_away,
    raw.away_name,
    raw.awayTeamName,
    raw.teams?.away?.name,
    raw.awayTeam?.name
  );

  const homeScore = scoreValue(firstDefined(raw.home_score, raw.homeScore, raw.home_goals, raw.homeGoals, raw.score_home, raw.home_team_score, raw.home?.score, raw.goals?.home, raw.score?.home));
  const awayScore = scoreValue(firstDefined(raw.away_score, raw.awayScore, raw.away_goals, raw.awayGoals, raw.score_away, raw.away_team_score, raw.away?.score, raw.goals?.away, raw.score?.away));
  const finished = truthyFinished(firstDefined(raw.finished, raw.status, raw.match_status, raw.state, raw.fixture?.status?.short, raw.fixture?.status?.long, raw.status_en, ''));
  const outcome = finished ? getOutcome(homeScore, awayScore) : null;

  return {
    local_keys: makeMatchKeys(home, away),
    finished: Boolean(outcome),
    outcome,
    home,
    away,
    homeScore,
    awayScore
  };
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function extractMatches(apiResponse) {
  const list = Array.isArray(apiResponse)
    ? apiResponse
    : firstDefined(apiResponse.games, apiResponse.data, apiResponse.matches, apiResponse.results, []);

  return (Array.isArray(list) ? list : [])
    .map(normalizeApiMatch)
    .filter(m => m.local_keys.length);
}

function buildFinishedIndex(matches) {
  const map = new Map();
  for (const match of matches) {
    if (!match.finished || !match.outcome) continue;
    for (const key of match.local_keys) map.set(key, match);
  }
  return map;
}

function getCountedMatches(predictions, matches) {
  const forecastIds = new Set(predictions.map(p => String(p.match_id || '').toUpperCase()));
  const counted = new Set();
  for (const match of matches) {
    if (!match.finished || !match.outcome) continue;
    for (const key of match.local_keys) if (forecastIds.has(key)) counted.add(key);
  }
  return counted;
}

function calculateRanking(predictions, matches) {
  const finishedByKey = buildFinishedIndex(matches);
  const ranking = new Map();

  for (const prediction of predictions) {
    const name = String(prediction.partecipante || '').trim();
    const matchId = String(prediction.match_id || '').trim().toUpperCase();
    const forecast = normalizeSign(prediction.pronostico);
    if (!name) continue;
    if (!ranking.has(name)) ranking.set(name, { partecipante: name, punti: 0 });
    if (!matchId || !forecast) continue;

    const match = finishedByKey.get(matchId);
    if (match && forecast === match.outcome) ranking.get(name).punti += 1;
  }

  return [...ranking.values()].sort((a, b) => b.punti - a.punti || a.partecipante.localeCompare(b.partecipante, 'it'));
}

function renderSummary(predictions, matches, ranking) {
  const participants = new Set(predictions.map(p => p.partecipante).filter(Boolean)).size;
  const counted = getCountedMatches(predictions, matches);
  const leader = ranking[0]?.partecipante || '—';
  els.summary.innerHTML = `
    <article class="stat"><span>Partecipanti</span><strong>${participants}</strong></article>
    <article class="stat"><span>Partite conteggiate</span><strong>${counted.size}</strong></article>
    <article class="stat"><span>Leader</span><strong>${leader}</strong></article>
  `;
  return counted.size;
}

function renderRanking(ranking) {
  if (!ranking.length) {
    els.rankingBody.innerHTML = '<tr><td colspan="3">Nessun pronostico valido trovato.</td></tr>';
    return;
  }
  els.rankingBody.innerHTML = ranking.map((row, index) => `
    <tr class="${index === 0 ? 'leader' : ''}">
      <td>${index + 1}</td>
      <td>${row.partecipante}</td>
      <td><strong>${row.punti}</strong></td>
    </tr>
  `).join('');
}

async function loadApp() {
  els.rankingBody.innerHTML = '<tr><td colspan="3">Aggiornamento in corso...</td></tr>';
  els.dataStatus.textContent = 'Caricamento pronostici...';

  let predictions = [];
  let matches = [];
  let apiOk = false;

  try {
    predictions = await fetchJson(CONFIG.predictionsUrl);
  } catch (error) {
    console.error(error);
    els.updatedAt.textContent = 'Errore';
    els.dataStatus.textContent = 'Pronostici non disponibili';
    els.summary.innerHTML = '<div class="error">Impossibile leggere data/pronostici.json.</div>';
    els.rankingBody.innerHTML = '<tr><td colspan="3">Errore nel caricamento dei pronostici.</td></tr>';
    return;
  }

  try {
    const apiResponse = await fetchJson(CONFIG.matchesApiUrl);
    matches = extractMatches(apiResponse);
    apiOk = matches.length > 0;
  } catch (error) {
    console.warn('Fonte risultati non disponibile:', error);
  }

  const ranking = calculateRanking(predictions, matches);
  const counted = renderSummary(predictions, matches, ranking);
  renderRanking(ranking);

  els.updatedAt.textContent = new Date().toLocaleString('it-IT');
  els.dataStatus.textContent = apiOk
    ? `Risultati online · ${matches.length} partite lette · ${counted} conteggiate`
    : 'Risultati online non disponibili';
}

els.reloadBtn.addEventListener('click', loadApp);
loadApp();
setInterval(loadApp, CONFIG.refreshMs);
