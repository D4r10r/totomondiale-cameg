const CONFIG = {
  predictionsUrl: 'data/pronostici.json',
  resultsUrl: 'data/risultati-auto.json'
};

const els = {
  updatedAt: document.getElementById('updatedAt'),
  statusText: document.getElementById('statusText'),
  rankingBody: document.getElementById('rankingBody'),
  summary: document.getElementById('summary'),
  reloadBtn: document.getElementById('reloadBtn')
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
  const participants = new Set(predictions.map(p => p.partecipante).filter(Boolean)).size;
  const predictedMatchIds = new Set(predictions.map(p => String(p.match_id || '').trim().toUpperCase()).filter(Boolean));
  const countedMatches = [...resultsByMatch.keys()].filter(matchId => predictedMatchIds.has(matchId)).length;
  const leader = ranking[0]?.name || '—';

  els.summary.innerHTML = `
    <article class="stat"><span>Partecipanti</span><strong>${participants}</strong></article>
    <article class="stat"><span>Partite conteggiate</span><strong>${countedMatches}</strong></article>
    <article class="stat"><span>Leader</span><strong>${escapeHtml(leader)}</strong></article>
  `;
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
    const predictions = await fetchJson(CONFIG.predictionsUrl);
    const rawResults = await fetchJson(CONFIG.resultsUrl, {
      updated_at: null,
      source_status: 'missing',
      results: []
    });

    const normalized = normalizeResults(rawResults);
    const ranking = calculateRanking(predictions, normalized.results);

    renderRanking(ranking);
    renderSummary(predictions, normalized.results, ranking);

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

els.reloadBtn.addEventListener('click', loadApp);
loadApp();
