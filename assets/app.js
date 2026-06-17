const CONFIG = {
  predictionsUrl: 'data/pronostici.json',
  matchesApiUrl: 'https://worldcup26.ir/get/games',
  refreshMs: 2 * 60 * 1000
};

const els = {
  updatedAt: document.getElementById('updatedAt'),
  rankingBody: document.getElementById('rankingBody'),
  matchesList: document.getElementById('matchesList'),
  summary: document.getElementById('summary'),
  reloadBtn: document.getElementById('reloadBtn'),
  dataStatus: document.getElementById('dataStatus')
};

const TEAM_ALIASES = {
  'MEXICO': ['MEX'],
  'SOUTH AFRICA': ['SUD'],
  'SOUTH KOREA': ['COR'],
  'KOREA REPUBLIC': ['COR'],
  'CZECH REPUBLIC': ['CEC'],
  'CZECHIA': ['CEC'],
  'CANADA': ['CAN'],
  'BOSNIA AND HERZEGOVINA': ['BOS'],
  'BOSNIA': ['BOS'],
  'UNITED STATES': ['USA'],
  'USA': ['USA'],
  'PARAGUAY': ['PAR'],
  'QATAR': ['QAT'],
  'SWITZERLAND': ['SVI', 'SVIZ'],
  'BRAZIL': ['BRA'],
  'MOROCCO': ['MAR'],
  'HAITI': ['HAI'],
  'SCOTLAND': ['SCO'],
  'AUSTRALIA': ['AUS'],
  'TURKIYE': ['TUR'],
  'TURKEY': ['TUR'],
  'GERMANY': ['GER'],
  'CURACAO': ['CURA', 'CUR'],
  'CURAÇAO': ['CURA', 'CUR'],
  'IVORY COAST': ['CAV'],
  "COTE D'IVOIRE": ['CAV'],
  'CÔTE D’IVOIRE': ['CAV'],
  'ECUADOR': ['ECU'],
  'SWEDEN': ['SVE'],
  'TUNISIA': ['TUN'],
  'JAPAN': ['JAP'],
  'SPAIN': ['SPA'],
  'CAPE VERDE': ['CAVE'],
  'CABO VERDE': ['CAVE'],
  'BELGIUM': ['BEL'],
  'EGYPT': ['EGI'],
  'SAUDI ARABIA': ['SAUDI'],
  'URUGUAY': ['URU'],
  'IRAN': ['IRAN'],
  'NEW ZEALAND': ['NZEL'],
  'FRANCE': ['FRA'],
  'SENEGAL': ['SEN'],
  'IRAQ': ['IRAQ'],
  'NORWAY': ['NOR'],
  'ARGENTINA': ['ARG'],
  'ALGERIA': ['ALG'],
  'AUSTRIA': ['AUS'],
  'JORDAN': ['GIOR'],
  'PORTUGAL': ['POR'],
  'CONGO DR': ['CONGO'],
  'DR CONGO': ['CONGO'],
  'CONGO': ['CONGO'],
  'UZBEKISTAN': ['UZB'],
  'COLOMBIA': ['COL'],
  'ENGLAND': ['ING'],
  'CROATIA': ['CROA'],
  'GHANA': ['GHA'],
  'PANAMA': ['PAN'],
  'NETHERLANDS': ['NED']
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

function getOutcome(homeScore, awayScore) {
  if (homeScore === null || awayScore === null || Number.isNaN(homeScore) || Number.isNaN(awayScore)) return null;
  if (homeScore > awayScore) return '1';
  if (homeScore < awayScore) return '2';
  return 'X';
}

function isFinished(status) {
  const s = String(status || '').toLowerCase();
  return ['finished', 'full_time', 'ft', 'ended', 'completed', 'final'].some(x => s.includes(x));
}

function isLive(status) {
  const s = String(status || '').toLowerCase();
  return ['live', 'in_play', '1h', '2h', 'halftime', 'half_time', 'ht'].some(x => s.includes(x));
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

function getTeamAliases(teamName) {
  const normalized = normalizeText(teamName);
  if (!normalized) return [];
  if (TEAM_ALIASES[normalized]) return TEAM_ALIASES[normalized];

  const matched = Object.entries(TEAM_ALIASES).find(([name]) => normalized.includes(name) || name.includes(normalized));
  return matched ? matched[1] : [normalized.slice(0, 4)];
}

function makeMatchKeys(homeName, awayName) {
  const homeAliases = getTeamAliases(homeName);
  const awayAliases = getTeamAliases(awayName);
  const keys = [];
  for (const h of homeAliases) {
    for (const a of awayAliases) {
      keys.push(`${h}-${a}`);
    }
  }
  return keys;
}

function normalizeApiMatch(raw) {
  const rawId = String(firstDefined(raw.id, raw.match_id, raw.game_id, raw.matchday, raw.number, raw.MatchNumber, raw.matchNumber) || '').trim();

  const home = firstDefined(raw.home_team, raw.homeTeam, raw.home_team_name, raw.home?.name_en, raw.home?.name, raw.home?.team, raw.team_home, raw.home_name, raw.homeTeamName, raw.teams?.home?.name, 'Casa');
  const away = firstDefined(raw.away_team, raw.awayTeam, raw.away_team_name, raw.away?.name_en, raw.away?.name, raw.away?.team, raw.team_away, raw.away_name, raw.awayTeamName, raw.teams?.away?.name, 'Trasferta');

  const homeScore = scoreValue(firstDefined(raw.home_score, raw.homeScore, raw.home_goals, raw.homeGoals, raw.score_home, raw.home_team_score, raw.home?.score, raw.goals?.home, raw.score?.home));
  const awayScore = scoreValue(firstDefined(raw.away_score, raw.awayScore, raw.away_goals, raw.awayGoals, raw.score_away, raw.away_team_score, raw.away?.score, raw.goals?.away, raw.score?.away));

  const status = firstDefined(raw.status, raw.match_status, raw.state, raw.fixture?.status?.short, raw.fixture?.status?.long, raw.status_en, '');
  const keys = makeMatchKeys(home, away);
  const finished = isFinished(status);
  const live = isLive(status);

  return {
    api_id: rawId,
    local_keys: keys,
    partita: `${home} - ${away}`,
    home_score: homeScore,
    away_score: awayScore,
    status,
    finished,
    live,
    outcome: finished ? getOutcome(homeScore, awayScore) : null
  };
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Errore HTTP ${response.status} su ${url}`);
  return response.json();
}

function extractMatches(apiResponse) {
  const list = Array.isArray(apiResponse)
    ? apiResponse
    : firstDefined(apiResponse.data, apiResponse.games, apiResponse.matches, apiResponse.results, []);

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
    if (!name || !matchId || !forecast) continue;

    if (!ranking.has(name)) ranking.set(name, { partecipante: name, punti: 0 });

    const match = finishedByKey.get(matchId);
    if (match && forecast === match.outcome) {
      ranking.get(name).punti += 1;
    }
  }

  return [...ranking.values()].sort((a, b) => {
    if (b.punti !== a.punti) return b.punti - a.punti;
    return a.partecipante.localeCompare(b.partecipante, 'it');
  });
}

function renderSummary(predictions, matches, ranking) {
  const participants = new Set(predictions.map(p => p.partecipante).filter(Boolean)).size;
  const finishedRelevant = new Set();
  const forecastIds = new Set(predictions.map(p => String(p.match_id || '').toUpperCase()));

  for (const match of matches) {
    if (!match.finished || !match.outcome) continue;
    for (const key of match.local_keys) {
      if (forecastIds.has(key)) finishedRelevant.add(key);
    }
  }

  const leader = ranking[0]?.partecipante || '—';
  els.summary.innerHTML = `
    <article class="stat"><span>Partecipanti</span><strong>${participants}</strong></article>
    <article class="stat"><span>Partite conteggiate</span><strong>${finishedRelevant.size}</strong></article>
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
      <td>${row.punti}</td>
    </tr>
  `).join('');
}

function renderMatches(matches, predictions) {
  const forecastIds = new Set(predictions.map(p => String(p.match_id || '').toUpperCase()));
  const relevant = matches.filter(m => m.local_keys.some(k => forecastIds.has(k)) && (m.finished || m.live)).slice(0, 20);

  if (!relevant.length) {
    els.matchesList.innerHTML = '<p>Nessuna partita live o conclusa disponibile per le partite del vostro file.</p>';
    return;
  }

  els.matchesList.innerHTML = relevant.map(m => {
    const label = m.live ? 'LIVE' : 'FINITA';
    const score = m.home_score !== null && m.away_score !== null ? `${m.home_score} - ${m.away_score}` : '—';
    const esito = m.finished ? `Esito: ${m.outcome}` : 'In corso';
    return `
      <article class="match ${m.live ? 'live' : ''}">
        <div><strong>${m.partita}</strong><br><small>${label} · ${m.local_keys.join(', ')}</small></div>
        <div><strong>${score}</strong><br><small>${esito}</small></div>
      </article>
    `;
  }).join('');
}

async function loadApp() {
  try {
    els.rankingBody.innerHTML = '<tr><td colspan="3">Aggiornamento in corso...</td></tr>';
    els.dataStatus.textContent = 'Connessione alla fonte risultati...';

    const [predictions, apiResponse] = await Promise.all([
      fetchJson(CONFIG.predictionsUrl),
      fetchJson(CONFIG.matchesApiUrl)
    ]);

    const matches = extractMatches(apiResponse);
    const ranking = calculateRanking(predictions, matches);

    els.updatedAt.textContent = new Date().toLocaleString('it-IT');
    els.dataStatus.textContent = `Fonte risultati online · ${matches.length} partite lette`;
    renderSummary(predictions, matches, ranking);
    renderRanking(ranking);
    renderMatches(matches, predictions);
  } catch (error) {
    console.error(error);
    els.updatedAt.textContent = 'Errore';
    els.dataStatus.textContent = 'Fonte risultati non raggiungibile';
    els.summary.innerHTML = '<div class="error">Impossibile aggiornare i dati. La pagina è pronta, ma l’API risultati non ha risposto o ha cambiato formato.</div>';
    els.rankingBody.innerHTML = '<tr><td colspan="3">Errore nel caricamento della classifica.</td></tr>';
    els.matchesList.innerHTML = '<p>Risultati live non disponibili in questo momento.</p>';
  }
}

els.reloadBtn.addEventListener('click', loadApp);
loadApp();
setInterval(loadApp, CONFIG.refreshMs);
