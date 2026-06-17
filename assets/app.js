const CONFIG = {
  predictionsUrl: 'data/pronostici.json',
  matchesApiUrl: 'https://worldcup26.ir/get/games',
  teamsApiUrl: 'https://worldcup26.ir/get/teams',
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
  'MEXICO': ['MEX'], 'MEX': ['MEX'],
  'SOUTH AFRICA': ['SUD'], 'SUD': ['SUD'], 'RSA': ['SUD'],
  'KOREA REPUBLIC': ['COR'], 'SOUTH KOREA': ['COR'], 'KOR': ['COR'],
  'CZECH REPUBLIC': ['CEC'], 'CZECHIA': ['CEC'], 'CZE': ['CEC'],
  'CANADA': ['CAN'], 'CAN': ['CAN'],
  'BOSNIA AND HERZEGOVINA': ['BOS'], 'BOSNIA': ['BOS'], 'BIH': ['BOS'],
  'UNITED STATES': ['USA'], 'UNITED STATES OF AMERICA': ['USA'], 'USA': ['USA'],
  'PARAGUAY': ['PAR'], 'PAR': ['PAR'],
  'QATAR': ['QAT'], 'QAT': ['QAT'],
  'SWITZERLAND': ['SVI', 'SVIZ'], 'SWI': ['SVI', 'SVIZ'], 'SUI': ['SVI', 'SVIZ'],
  'BRAZIL': ['BRA'], 'BRA': ['BRA'],
  'MOROCCO': ['MAR'], 'MAR': ['MAR'],
  'HAITI': ['HAI'], 'HAI': ['HAI'],
  'SCOTLAND': ['SCO'], 'SCO': ['SCO'],
  'AUSTRALIA': ['AUS'], 'AUS': ['AUS'],
  'TURKEY': ['TUR'], 'TURKIYE': ['TUR'], 'TUR': ['TUR'],
  'ARGENTINA': ['ARG'], 'ARG': ['ARG'],
  'ALGERIA': ['ALG'], 'ALG': ['ALG'],
  'AUSTRIA': ['AUS'], 'AUT': ['AUS'],
  'JORDAN': ['GIOR'], 'JOR': ['GIOR'],
  'GERMANY': ['GER'], 'GER': ['GER'], 'DEU': ['GER'],
  'CURACAO': ['CURA', 'CUR'], 'CURAÇAO': ['CURA', 'CUR'], 'CUW': ['CURA', 'CUR'],
  'NETHERLANDS': ['NED'], 'HOLLAND': ['NED'], 'NED': ['NED'],
  'JAPAN': ['JAP'], 'JPN': ['JAP'],
  'IVORY COAST': ['CAV'], 'COTE D IVOIRE': ['CAV'], "COTE D'IVOIRE": ['CAV'], 'CIV': ['CAV'],
  'ECUADOR': ['ECU'], 'ECU': ['ECU'],
  'BELGIUM': ['BEL'], 'BEL': ['BEL'],
  'EGYPT': ['EGI'], 'EGY': ['EGI'],
  'IRAN': ['IRAN'], 'IRN': ['IRAN'],
  'SWEDEN': ['SVE'], 'SWE': ['SVE'],
  'TUNISIA': ['TUN'], 'TUN': ['TUN'],
  'SPAIN': ['SPA'], 'ESP': ['SPA'],
  'CAPE VERDE': ['CAVE'], 'CABO VERDE': ['CAVE'], 'CPV': ['CAVE'],
  'SAUDI ARABIA': ['SAUDI'], 'KSA': ['SAUDI'], 'SAU': ['SAUDI'],
  'NEW ZEALAND': ['NZEL'], 'NZL': ['NZEL'],
  'URUGUAY': ['URU'], 'URU': ['URU'],
  'FRANCE': ['FRA'], 'FRA': ['FRA'],
  'SENEGAL': ['SEN'], 'SEN': ['SEN'],
  'NORWAY': ['NOR'], 'NOR': ['NOR'],
  'IRAQ': ['IRAQ'], 'IRQ': ['IRAQ'],
  'PORTUGAL': ['POR'], 'POR': ['POR'],
  'COLOMBIA': ['COL'], 'COL': ['COL'],
  'UZBEKISTAN': ['UZB'], 'UZB': ['UZB'],
  'CONGO DR': ['CONGO'], 'DR CONGO': ['CONGO'], 'DEMOCRATIC REPUBLIC OF THE CONGO': ['CONGO'], 'COD': ['CONGO'], 'DRC': ['CONGO'],
  'ENGLAND': ['ING'], 'ENG': ['ING'],
  'CROATIA': ['CROA'], 'CRO': ['CROA'],
  'GHANA': ['GHA'], 'GHA': ['GHA'],
  'PANAMA': ['PAN'], 'PAN': ['PAN']
};

function stripAccents(value) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
function normalizeText(value) { return stripAccents(value).toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); }
function normalizeSign(value) { const v = String(value || '').trim().toUpperCase(); return ['1','X','2'].includes(v) ? v : ''; }
function firstDefined(...values) { return values.find(v => v !== undefined && v !== null && v !== ''); }
function escapeHtml(value) { return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;'); }

function scoreValue(value) {
  const v = firstDefined(value?.current, value?.total, value?.goals, value?.score, value);
  if (v === undefined || v === null || v === '' || String(v).toLowerCase() === 'null') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function truthyFinished(raw) {
  const values = [raw.finished, raw.is_finished, raw.completed, raw.isCompleted, raw.played, raw.isPlayed, raw.status, raw.match_status, raw.state, raw.status_en, raw.fixture?.status?.short, raw.fixture?.status?.long];
  return values.some(value => {
    const s = String(value ?? '').trim().toLowerCase();
    return ['true','1','yes','y','finished','full_time','full time','ft','ended','completed','complete','final','finalizado','played'].includes(s) || s.includes('finished') || s.includes('ended') || s.includes('full');
  });
}

function getOutcome(homeScore, awayScore) {
  if (homeScore === null || awayScore === null) return null;
  if (homeScore > awayScore) return '1';
  if (homeScore < awayScore) return '2';
  return 'X';
}

function getTeamAliases(value) {
  const normalized = normalizeText(value);
  if (!normalized) return [];
  if (TEAM_ALIASES[normalized]) return TEAM_ALIASES[normalized];
  const matched = Object.entries(TEAM_ALIASES).find(([name]) => normalized.includes(name) || name.includes(normalized));
  return matched ? matched[1] : [normalized.slice(0, 4)];
}

function makeMatchKeys(homeValue, awayValue) {
  const keys = [];
  for (const h of getTeamAliases(homeValue)) for (const a of getTeamAliases(awayValue)) keys.push(`${h}-${a}`);
  return [...new Set(keys)];
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}

function extractArray(response) {
  if (Array.isArray(response)) return response;
  return firstDefined(response.games, response.data, response.matches, response.results, response.teams, response.items, []);
}

function teamDisplayName(team) {
  return firstDefined(team?.fifa_code, team?.code, team?.name_en, team?.name, team?.team_name, team?.country, team?.short_name);
}

function buildTeamIndex(apiResponse) {
  const list = extractArray(apiResponse);
  const map = new Map();
  for (const team of Array.isArray(list) ? list : []) {
    const ids = [team.id, team._id, team.team_id, team.fifa_id, team.slug].filter(v => v !== undefined && v !== null && v !== '');
    const display = teamDisplayName(team);
    for (const id of ids) map.set(String(id), display);
  }
  return map;
}

function teamFromRaw(raw, side, teamIndex) {
  const id = firstDefined(raw[`${side}_team_id`], raw[`${side}TeamId`], raw[`${side}_id`], raw[side]?.id, raw[side]?.team_id, raw.teams?.[side]?.id, raw[`${side}Team`]?.id);
  const byId = id !== undefined && id !== null ? teamIndex.get(String(id)) : null;
  return firstDefined(
    byId,
    raw[`${side}_team_code`], raw[`${side}_team_fifa_code`], raw[`${side}TeamCode`],
    raw[`${side}_team_name_en`], raw[`${side}_team`], raw[`${side}Team`], raw[`${side}_team_name`],
    raw[side]?.fifa_code, raw[side]?.code, raw[side]?.name_en, raw[side]?.name, raw[side]?.team,
    raw.teams?.[side]?.fifa_code, raw.teams?.[side]?.code, raw.teams?.[side]?.name,
    raw[`${side}_name`], raw[`${side}TeamName`]
  );
}

function normalizeApiMatch(raw, teamIndex) {
  const home = teamFromRaw(raw, 'home', teamIndex);
  const away = teamFromRaw(raw, 'away', teamIndex);
  const homeScore = scoreValue(firstDefined(raw.home_score, raw.homeScore, raw.home_goals, raw.homeGoals, raw.score_home, raw.home_team_score, raw.homeTeamScore, raw.home?.score, raw.home?.goals, raw.goals?.home, raw.score?.home, raw.result?.home, raw.result?.home_score, raw.result?.homeScore));
  const awayScore = scoreValue(firstDefined(raw.away_score, raw.awayScore, raw.away_goals, raw.awayGoals, raw.score_away, raw.away_team_score, raw.awayTeamScore, raw.away?.score, raw.away?.goals, raw.goals?.away, raw.score?.away, raw.result?.away, raw.result?.away_score, raw.result?.awayScore));
  const outcome = truthyFinished(raw) ? getOutcome(homeScore, awayScore) : null;
  return { local_keys: makeMatchKeys(home, away), finished: Boolean(outcome), outcome, home, away, homeScore, awayScore, raw };
}

function extractMatches(apiResponse, teamIndex) {
  const list = extractArray(apiResponse);
  return (Array.isArray(list) ? list : []).map(raw => normalizeApiMatch(raw, teamIndex)).filter(m => m.local_keys.length);
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
  return [...ranking.values()].sort((a,b) => b.punti - a.punti || a.partecipante.localeCompare(b.partecipante, 'it'));
}

function renderSummary(predictions, matches, ranking) {
  const participants = new Set(predictions.map(p => p.partecipante).filter(Boolean)).size;
  const counted = getCountedMatches(predictions, matches);
  const leader = ranking[0]?.partecipante || '—';
  els.summary.innerHTML = `
    <article class="stat"><span>Partecipanti</span><strong>${participants}</strong></article>
    <article class="stat"><span>Partite conteggiate</span><strong>${counted.size}</strong></article>
    <article class="stat"><span>Leader</span><strong>${escapeHtml(leader)}</strong></article>
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
      <td>${escapeHtml(row.partecipante)}</td>
      <td><strong>${row.punti}</strong></td>
    </tr>
  `).join('');
}

async function loadRemoteResults() {
  const [gamesResponse, teamsResponse] = await Promise.all([
    fetchJson(CONFIG.matchesApiUrl),
    fetchJson(CONFIG.teamsApiUrl).catch(() => [])
  ]);
  const teamIndex = buildTeamIndex(teamsResponse);
  return extractMatches(gamesResponse, teamIndex);
}

async function loadApp() {
  els.rankingBody.innerHTML = '<tr><td colspan="3">Aggiornamento in corso...</td></tr>';
  els.dataStatus.textContent = 'Caricamento pronostici...';
  let predictions = [];
  let matches = [];
  let resultsOk = false;
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
    matches = await loadRemoteResults();
    resultsOk = matches.length > 0;
  } catch (error) {
    console.warn('Fonte risultati non disponibile:', error);
  }
  const ranking = calculateRanking(predictions, matches);
  const counted = renderSummary(predictions, matches, ranking);
  renderRanking(ranking);
  els.updatedAt.textContent = new Date().toLocaleString('it-IT');
  const finished = matches.filter(m => m.finished).length;
  els.dataStatus.textContent = resultsOk
    ? `Risultati automatici · ${matches.length} partite lette · ${finished} concluse · ${counted} conteggiate`
    : 'Risultati automatici non disponibili';
}

els.reloadBtn.addEventListener('click', loadApp);
loadApp();
setInterval(loadApp, CONFIG.refreshMs);
