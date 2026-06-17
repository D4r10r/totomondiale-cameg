const CONFIG = {
  predictionsUrl: 'data/pronostici.json',
  // Fonte risultati opzionale. Non mostriamo più il live.
  // Se la fonte non risponde, la pagina resta funzionante e mostra classifica a 0 punti.
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
  'MEXICO': ['MEX'], 'SOUTH AFRICA': ['SUD'], 'CANADA': ['CAN'], 'BRAZIL': ['BRA'],
  'SCOTLAND': ['SCO'], 'ARGENTINA': ['ARG'], 'ALGERIA': ['ALG'], 'AUSTRIA': ['AUS'],
  'JORDAN': ['GIOR'], 'FRANCE': ['FRA'], 'GERMANY': ['GER'], 'SPAIN': ['SPA'],
  'PORTUGAL': ['POR'], 'ENGLAND': ['ING'], 'NETHERLANDS': ['NED'], 'BELGIUM': ['BEL'],
  'URUGUAY': ['URU'], 'COLOMBIA': ['COL'], 'CROATIA': ['CROA'], 'GHANA': ['GHA'],
  'JAPAN': ['JAP'], 'SENEGAL': ['SEN'], 'SWITZERLAND': ['SVI', 'SVIZ'],
  'UNITED STATES': ['USA'], 'USA': ['USA'], 'PARAGUAY': ['PAR'], 'QATAR': ['QAT'],
  'MOROCCO': ['MAR'], 'HAITI': ['HAI'], 'AUSTRALIA': ['AUS'], 'TURKEY': ['TUR'],
  'TURKIYE': ['TUR'], 'CURACAO': ['CURA', 'CUR'], 'CURAÇAO': ['CURA', 'CUR'],
  'IVORY COAST': ['CAV'], "COTE D IVOIRE": ['CAV'], 'ECUADOR': ['ECU'],
  'SWEDEN': ['SVE'], 'TUNISIA': ['TUN'], 'CAPE VERDE': ['CAVE'], 'EGYPT': ['EGI'],
  'SAUDI ARABIA': ['SAUDI'], 'IRAN': ['IRAN'], 'NEW ZEALAND': ['NZEL'],
  'IRAQ': ['IRAQ'], 'NORWAY': ['NOR'], 'CONGO DR': ['CONGO'], 'DR CONGO': ['CONGO'],
  'UZBEKISTAN': ['UZB'], 'PANAMA': ['PAN'], 'SOUTH KOREA': ['COR'],
  'KOREA REPUBLIC': ['COR'], 'CZECH REPUBLIC': ['CEC'], 'CZECHIA': ['CEC'],
  'BOSNIA AND HERZEGOVINA': ['BOS'], 'BOSNIA': ['BOS']
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
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function isFinished(status) {
  const s = String(status || '').toLowerCase();
  return ['finished', 'full_time', 'ft', 'ended', 'completed', 'final'].some(x => s.includes(x));
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
  const matched = Object.entries(TEAM_ALIASES).find(([name]) => normalized.includes(name) || name.includes(normalized));
  return matched ? matched[1] : [normalized.slice(0, 4)];
}

function makeMatchKeys(homeName, awayName) {
  const keys = [];
  for (const h of getTeamAliases(homeName)) {
    for (const a of getTeamAliases(awayName)) keys.push(`${h}-${a}`);
  }
  return keys;
}

function normalizeApiMatch(raw) {
  const home = firstDefined(raw.home_team, raw.homeTeam, raw.home_team_name, raw.home?.name_en, raw.home?.name, raw.home?.team, raw.team_home, raw.home_name, raw.homeTeamName, raw.teams?.home?.name, raw.homeTeam?.name, 'Casa');
  const away = firstDefined(raw.away_team, raw.awayTeam, raw.away_team_name, raw.away?.name_en, raw.away?.name, raw.away?.team, raw.team_away, raw.away_name, raw.awayTeamName, raw.teams?.away?.name, raw.awayTeam?.name, 'Trasferta');
  const homeScore = scoreValue(firstDefined(raw.home_score, raw.homeScore, raw.home_goals, raw.homeGoals, raw.score_home, raw.home_team_score, raw.home?.score, raw.goals?.home, raw.score?.home));
  const awayScore = scoreValue(firstDefined(raw.away_score, raw.awayScore, raw.away_goals, raw.awayGoals, raw.score_away, raw.away_team_score, raw.away?.score, raw.goals?.away, raw.score?.away));
  const status = firstDefined(raw.status, raw.match_status, raw.state, raw.fixture?.status?.short, raw.fixture?.status?.long, raw.status_en, '');
  const outcome = isFinished(status) ? getOutcome(homeScore, awayScore) : null;
  return { local_keys: makeMatchKeys(home, away), finished: Boolean(outcome), outcome };
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function extractMatches(apiResponse) {
  const list = Array.isArray(apiResponse) ? apiResponse : firstDefined(apiResponse.data, apiResponse.games, apiResponse.matches, apiResponse.results, []);
  return (Array.isArray(list) ? list : []).map(normalizeApiMatch).filter(m => m.local_keys.length);
}

function buildFinishedIndex(matches) {
  const map = new Map();
  for (const match of matches) {
    if (!match.finished || !match.outcome) continue;
    for (const key of match.local_keys) map.set(key, match);
  }
  return map;
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
  const forecastIds = new Set(predictions.map(p => String(p.match_id || '').toUpperCase()));
  const counted = new Set();
  for (const match of matches) {
    if (!match.finished || !match.outcome) continue;
    for (const key of match.local_keys) if (forecastIds.has(key)) counted.add(key);
  }
  const leader = ranking[0]?.partecipante || '—';
  els.summary.innerHTML = `
    <article class="stat"><span>Partecipanti</span><strong>${participants}</strong></article>
    <article class="stat"><span>Partite conteggiate</span><strong>${counted.size}</strong></article>
    <article class="stat"><span>Leader</span><strong>${leader}</strong></article>
  `;
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
  els.updatedAt.textContent = new Date().toLocaleString('it-IT');
  els.dataStatus.textContent = apiOk ? `Risultati letti · ${matches.length} partite` : 'Risultati non disponibili: classifica provvisoria';
  renderSummary(predictions, matches, ranking);
  renderRanking(ranking);
}

els.reloadBtn.addEventListener('click', loadApp);
loadApp();
setInterval(loadApp, CONFIG.refreshMs);
