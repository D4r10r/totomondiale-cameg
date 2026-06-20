const CONFIG = {
  predictionsUrl: 'data/pronostici.json',
  resultsUrl: 'data/risultati-auto.json'
};

const els = {
  updatedAt: document.getElementById('updatedAt'),
  statusText: document.getElementById('statusText'),
  rankingBody: document.getElementById('rankingBody'),
  summary: document.getElementById('summary'),
  liveMatches: document.getElementById('liveMatches'),
  liveStatus: document.getElementById('liveStatus'),
  reloadBtn: document.getElementById('reloadBtn')
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

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalizeSign(value) {
  const v = String(value || '').trim().toUpperCase();
  return ['1', 'X', '2'].includes(v) ? v : '';
}

function normalizeTeamName(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
}

function flagForTeam(teamName) {
  return TEAM_FLAGS[normalizeTeamName(teamName)] || '';
}

function renderFlag(teamName, flagCode) {
  const rawCode = String(flagCode || '').trim().toLowerCase();
  const code = /^[a-z]{2}$/.test(rawCode) ? rawCode : flagForTeam(teamName);
  if (!code) return '<span class="live-flag live-flag-fallback"></span>';

  return `<img class="live-flag" src="assets/flags/${escapeHtml(code)}.svg" alt="" loading="lazy" onerror="this.outerHTML='<span class=&quot;live-flag live-flag-fallback&quot;></span>'">`;
}

async function fetchJson(url, fallback = null) {
  try {
    const response = await fetch(`${url}?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    if (fallback !== null) return fallback;
    throw error;
  }
}

function normalizeResults(resultsPayload) {
  const list = Array.isArray(resultsPayload) ? resultsPayload : (resultsPayload?.results || []);
  const map = new Map();

  for (const row of list) {
    const matchId = String(row.match_id || '').trim().toUpperCase();
    const outcome = normalizeSign(row.outcome || row.risultato);
    const finished = row.finished === true || String(row.status || '').toLowerCase() === 'finished';
    if (matchId && outcome && finished) {
      map.set(matchId, { ...row, match_id: matchId, outcome, finished: true });
    }
  }

  return {
    updated_at: resultsPayload?.updated_at || null,
    source_status: resultsPayload?.source_status || 'unknown',
    results: map
  };
}

function calculateRanking(predictions, resultsByMatch) {
  const ranking = new Map();

  for (const prediction of predictions) {
    const name = String(prediction.partecipante || '').trim();
    const matchId = String(prediction.match_id || '').trim().toUpperCase();
    const forecast = normalizeSign(prediction.pronostico);

    if (!name) continue;
    if (!ranking.has(name)) ranking.set(name, { name, points: 0 });

    const result = resultsByMatch.get(matchId);
    if (result && forecast && forecast === result.outcome) {
      ranking.get(name).points += 1;
    }
  }

  return [...ranking.values()].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, 'it'));
}

function renderRanking(ranking) {
  if (!ranking.length) {
    els.rankingBody.innerHTML = '<tr><td colspan="3">Nessun partecipante trovato.</td></tr>';
    return;
  }

  els.rankingBody.innerHTML = ranking.map((row, index) => `
    <tr class="${index === 0 ? 'leader' : ''}">
      <td>${index + 1}</td>
      <td>${escapeHtml(row.name)}</td>
      <td><strong>${row.points}</strong></td>
    </tr>
  `).join('');
}

function renderSummary(predictions, resultsByMatch, ranking) {
  const predictedMatchIds = new Set(predictions.map(p => String(p.match_id || '').trim().toUpperCase()).filter(Boolean));
  const countedMatches = [...resultsByMatch.keys()].filter(matchId => predictedMatchIds.has(matchId)).length;
  const leader = ranking[0]?.name || '—';

  els.summary.innerHTML = `
    <article class="stat"><span>Partite conteggiate</span><strong>${countedMatches}</strong></article>
    <article class="stat"><span>Leader</span><strong>${escapeHtml(leader)}</strong></article>
  `;
}

function fallbackLiveMatches(resultsByMatch) {
  return [...resultsByMatch.values()]
    .slice()
    .reverse()
    .slice(0, 2)
    .map(match => ({
      home: match.home || String(match.match_id || '').split('-')[0],
      away: match.away || String(match.match_id || '').split('-')[1],
      home_flag: flagForTeam(match.home),
      away_flag: flagForTeam(match.away),
      home_score: match.home_score ?? '',
      away_score: match.away_score ?? '',
      minute: 'FT'
    }));
}

function renderLiveMatches(rawResults, resultsByMatch) {
  if (!els.liveMatches || !els.liveStatus) return;

  const matches = (Array.isArray(rawResults?.live_matches) && rawResults.live_matches.length)
    ? rawResults.live_matches.slice(0, 2)
    : fallbackLiveMatches(resultsByMatch);

  if (!matches.length) {
    els.liveStatus.textContent = 'Nessun risultato disponibile';
    els.liveMatches.innerHTML = '<p class="hint">I risultati appariranno qui appena disponibili.</p>';
    return;
  }

  els.liveStatus.textContent = matches.some(match => String(match.minute || '').toUpperCase() !== 'FT')
    ? 'Partite in corso'
    : 'Ultimi risultati';

  els.liveMatches.innerHTML = matches.map(match => `
    <article class="live-match">
      <div class="live-board">
        <div class="live-team live-team-home">
          ${renderFlag(match.home, match.home_flag)}
          <span class="live-name">${escapeHtml(match.home || '')}</span>
        </div>
        <div class="live-score">
          <strong>${escapeHtml(match.home_score ?? '')}</strong>
          <span>-</span>
          <strong>${escapeHtml(match.away_score ?? '')}</strong>
        </div>
        <div class="live-team live-team-away">
          <span class="live-name">${escapeHtml(match.away || '')}</span>
          ${renderFlag(match.away, match.away_flag)}
        </div>
      </div>
      <div class="live-minute">${escapeHtml(match.minute || 'Live')}</div>
    </article>
  `).join('');
}

function formatUpdatedAt(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('it-IT');
}

async function loadApp() {
  els.rankingBody.innerHTML = '<tr><td colspan="3">Caricamento classifica...</td></tr>';
  els.statusText.textContent = 'Caricamento dati...';

  try {
    const predictions = await fetchJson(CONFIG.predictionsUrl, []);
    const rawResults = await fetchJson(CONFIG.resultsUrl, { updated_at: null, source_status: 'missing', results: [] });
    const normalized = normalizeResults(rawResults);
    const ranking = calculateRanking(predictions, normalized.results);

    renderRanking(ranking);
    renderSummary(predictions, normalized.results, ranking);
    renderLiveMatches(rawResults, normalized.results);

    els.updatedAt.textContent = formatUpdatedAt(normalized.updated_at);
    els.statusText.textContent = normalized.results.size
      ? `Risultati caricati · ${normalized.results.size} partite concluse`
      : 'Nessun risultato concluso disponibile';
  } catch (error) {
    console.error(error);
    els.updatedAt.textContent = 'Errore';
    els.statusText.textContent = 'Errore nel caricamento dati';
    els.summary.innerHTML = '<div class="error">Impossibile caricare i dati del Totomondiale.</div>';
    els.rankingBody.innerHTML = '<tr><td colspan="3">Errore nel caricamento della classifica.</td></tr>';
  }
}

els.reloadBtn?.addEventListener('click', loadApp);
loadApp();
