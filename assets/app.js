const CONFIG = {
  predictionsUrl: 'data/pronostici.json',
  resultsUrl: 'data/risultati-auto.json',
  refreshMs: 5 * 60 * 1000
};

const els = {
  updatedAt: document.getElementById('updatedAt'),
  resultStatus: document.getElementById('resultStatus'),
  rankingBody: document.getElementById('rankingBody'),
  summary: document.getElementById('summary'),
  reloadBtn: document.getElementById('reloadBtn')
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
  'AUSTRALIA': ['AUS'],
  'AUSTRIA': ['AUT', 'AUS'],
  'AUS': ['AUS', 'AUT'],
  'TURKEY': ['TUR'], 'TURKIYE': ['TUR'], 'TUR': ['TUR'],
  'ARGENTINA': ['ARG'], 'ARG': ['ARG'],
  'ALGERIA': ['ALG'], 'ALG': ['ALG'],
  'JORDAN': ['GIOR'], 'JOR': ['GIOR'], 'GIOR': ['GIOR'],
  'GERMANY': ['GER'], 'GER': ['GER'], 'DEU': ['GER'],
  'CURACAO': ['CURA', 'CUR'], 'CURAÇAO': ['CURA', 'CUR'], 'CUW': ['CURA', 'CUR'],
  'NETHERLANDS': ['NED'], 'HOLLAND': ['NED'], 'NED': ['NED'],
  'JAPAN': ['JAP'], 'JPN': ['JAP'], 'JAP': ['JAP'],
  'IVORY COAST': ['CAV'], 'COTE D IVOIRE': ['CAV'], "COTE D'IVOIRE": ['CAV'], 'CIV': ['CAV'],
  'ECUADOR': ['ECU'], 'ECU': ['ECU'],
  'BELGIUM': ['BEL'], 'BEL': ['BEL'],
  'EGYPT': ['EGI'], 'EGY': ['EGI'], 'EGI': ['EGI'],
  'IRAN': ['IRAN'], 'IRN': ['IRAN'],
  'SWEDEN': ['SVE'], 'SWE': ['SVE'], 'SVE': ['SVE'],
  'TUNISIA': ['TUN'], 'TUN': ['TUN'],
  'SPAIN': ['SPA'], 'ESP': ['SPA'], 'SPA': ['SPA'],
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
  'CROATIA': ['CROA', 'CRO'], 'CRO': ['CROA', 'CRO'],
  'GHANA': ['GHA'], 'GHA': ['GHA'],
  'PANAMA': ['PAN'], 'PAN': ['PAN']
};

function escapeHtml(value) {
  return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
}

function normalizeText(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeSign(value) {
  const v = String(value || '').trim().toUpperCase();
  return ['1', 'X', '2'].includes(v) ? v : '';
}

function getOutcome(home, away) {
  if (!Number.isFinite(home) || !Number.isFinite(away)) return null;
  if (home > away) return '1';
  if (home < away) return '2';
  return 'X';
}

function scoreValue(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'object') {
    return scoreValue(value.current ?? value.total ?? value.goals ?? value.score);
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function isFinished(raw) {
  const values = [raw.finished, raw.is_finished, raw.completed, raw.isCompleted, raw.played, raw.isPlayed, raw.status, raw.match_status, raw.state, raw.status_en, raw.fixture?.status?.short, raw.fixture?.status?.long];
  return values.some(value => {
    const s = String(value ?? '').trim().toLowerCase();
    return ['true','1','yes','finished','full_time','full time','ft','ended','completed','complete','final','played'].includes(s) || s.includes('finished') || s.includes('full') || s.includes('ended');
  });
}

function first(...values) {
  return values.find(v => v !== undefined && v !== null && v !== '');
}

function getAliases(value) {
  const normalized = normalizeText(value);
  if (!normalized) return [];
  if (TEAM_ALIASES[normalized]) return TEAM_ALIASES[normalized];
  return [normalized];
}

function makeKeys(home, away) {
  const keys = [];
  for (const h of getAliases(home)) {
    for (const a of getAliases(away)) keys.push(`${h}-${a}`);
  }
  return [...new Set(keys)];
}

function extractArray(response) {
  if (Array.isArray(response)) return response;
  return response?.games || response?.data || response?.matches || response?.results || response?.items || [];
}

function buildTeamIndex(teams) {
  const map = new Map();
  for (const team of extractArray(teams)) {
    const name = first(team.fifa_code, team.code, team.name_en, team.name, team.team_name, team.country, team.short_name);
    for (const id of [team.id, team._id, team.team_id, team.fifa_id, team.slug]) {
      if (id !== undefined && id !== null && id !== '') map.set(String(id), name);
    }
  }
  return map;
}

function teamFromRaw(raw, side, teamIndex) {
  const id = first(raw[`${side}_team_id`], raw[`${side}TeamId`], raw[`${side}_id`], raw[side]?.id, raw[side]?.team_id, raw.teams?.[side]?.id, raw[`${side}Team`]?.id);
  const byId = id !== undefined && id !== null ? teamIndex.get(String(id)) : null;
  return first(
    byId,
    raw[`${side}_team_code`], raw[`${side}_team_fifa_code`], raw[`${side}TeamCode`],
    raw[`${side}_team_name_en`], raw[`${side}_team`], raw[`${side}Team`], raw[`${side}_team_name`],
    raw[side]?.fifa_code, raw[side]?.code, raw[side]?.name_en, raw[side]?.name, raw[side]?.team,
    raw.teams?.[side]?.fifa_code, raw.teams?.[side]?.code, raw.teams?.[side]?.name,
    raw[`${side}_name`], raw[`${side}TeamName`]
  );
}

function normalizeMatch(raw, teamIndex) {
  const home = teamFromRaw(raw, 'home', teamIndex);
  const away = teamFromRaw(raw, 'away', teamIndex);
  const homeScore = scoreValue(first(raw.home_score, raw.homeScore, raw.home_goals, raw.homeGoals, raw.score_home, raw.home_team_score, raw.homeTeamScore, raw.home?.score, raw.home?.goals, raw.goals?.home, raw.score?.home, raw.result?.home, raw.result?.home_score, raw.result?.homeScore));
  const awayScore = scoreValue(first(raw.away_score, raw.awayScore, raw.away_goals, raw.awayGoals, raw.score_away, raw.away_team_score, raw.awayTeamScore, raw.away?.score, raw.away?.goals, raw.goals?.away, raw.score?.away, raw.result?.away, raw.result?.away_score, raw.result?.awayScore));
  const outcome = isFinished(raw) ? getOutcome(homeScore, awayScore) : null;
  return { keys: makeKeys(home, away), finished: Boolean(outcome), outcome };
}

async function fetchJson(url) {
  const sep = url.includes('?') ? '&' : '?';
  const response = await fetch(`${url}${sep}t=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}

function normalizeResults(resultsFile) {
  const teamIndex = buildTeamIndex(resultsFile.teams || []);
  const matches = extractArray(resultsFile.games || resultsFile);
  const finishedByKey = new Map();

  for (const raw of matches) {
    const match = normalizeMatch(raw, teamIndex);
    if (!match.finished || !match.outcome) continue;
    for (const key of match.keys) finishedByKey.set(String(key).toUpperCase(), match.outcome);
  }

  return finishedByKey;
}

function calculateRanking(predictions, finishedByKey) {
  const ranking = new Map();
  const countedMatches = new Set();

  for (const row of predictions) {
    const name = String(row.partecipante || '').trim();
    const matchId = String(row.match_id || '').trim().toUpperCase();
    const forecast = normalizeSign(row.pronostico);
    if (!name) continue;
    if (!ranking.has(name)) ranking.set(name, { nome: name, punti: 0 });
    if (!matchId || !forecast || !finishedByKey.has(matchId)) continue;
    countedMatches.add(matchId);
    if (forecast === finishedByKey.get(matchId)) ranking.get(name).punti += 1;
  }

  const rows = [...ranking.values()].sort((a, b) => b.punti - a.punti || a.nome.localeCompare(b.nome, 'it'));
  return { rows, countedMatches };
}

function renderSummary(predictions, countedMatches, ranking) {
  const participants = new Set(predictions.map(p => p.partecipante).filter(Boolean)).size;
  const leader = ranking[0]?.nome || '—';
  els.summary.innerHTML = `
    <article class="stat"><span>Partecipanti</span><strong>${participants}</strong></article>
    <article class="stat"><span>Partite conteggiate</span><strong>${countedMatches.size}</strong></article>
    <article class="stat"><span>Leader</span><strong>${escapeHtml(leader)}</strong></article>
  `;
}

function renderRanking(ranking) {
  if (!ranking.length) {
    els.rankingBody.innerHTML = '<tr><td colspan="3">Nessun pronostico trovato.</td></tr>';
    return;
  }
  els.rankingBody.innerHTML = ranking.map((row, index) => `
    <tr class="${index === 0 ? 'leader' : ''}">
      <td>${index + 1}</td>
      <td>${escapeHtml(row.nome)}</td>
      <td><strong>${row.punti}</strong></td>
    </tr>
  `).join('');
}

async function loadApp() {
  els.rankingBody.innerHTML = '<tr><td colspan="3">Caricamento...</td></tr>';

  try {
    const [predictions, resultsFile] = await Promise.all([
      fetchJson(CONFIG.predictionsUrl),
      fetchJson(CONFIG.resultsUrl).catch(error => ({ ok: false, error: String(error), games: [], teams: [], updated_at: null }))
    ]);

    const finishedByKey = normalizeResults(resultsFile);
    const { rows, countedMatches } = calculateRanking(predictions, finishedByKey);

    renderSummary(predictions, countedMatches, rows);
    renderRanking(rows);

    els.updatedAt.textContent = resultsFile.updated_at ? new Date(resultsFile.updated_at).toLocaleString('it-IT') : '—';
    els.resultStatus.textContent = resultsFile.ok
      ? `Risultati letti: ${extractArray(resultsFile.games || resultsFile).length} partite`
      : 'Risultati automatici non ancora disponibili';
  } catch (error) {
    console.error(error);
    els.updatedAt.textContent = 'Errore';
    els.resultStatus.textContent = 'Errore caricamento dati';
    els.summary.innerHTML = '<div class="error">Impossibile leggere i dati locali.</div>';
    els.rankingBody.innerHTML = '<tr><td colspan="3">Errore nel caricamento.</td></tr>';
  }
}

els.reloadBtn?.addEventListener('click', loadApp);
loadApp();
setInterval(loadApp, CONFIG.refreshMs);
