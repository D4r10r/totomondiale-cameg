const CONFIG = {
  predictionsUrl: 'data/pronostici.json',
  resultsUrl: 'data/risultati-auto.json'
};

const els = {
  container: document.getElementById('predictionSheets'),
  updatedAt: document.getElementById('updatedAt'),
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

function formatUpdatedAt(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('it-IT');
}

function formatMatchHeader(match) {
  const parts = String(match || '').split('-').map(x => x.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const home = escapeHtml(parts[0]);
    const away = escapeHtml(parts.slice(1).join('-'));
    return `<span class="team-code">${home}</span><span class="vs-sep">-</span><span class="team-code">${away}</span>`;
  }
  return escapeHtml(match);
}

function dayOrder(day) {
  const d = String(day || '').toUpperCase();
  if (d.includes('PRIMA')) return 1;
  if (d.includes('SECONDA')) return 2;
  if (d.includes('TERZA')) return 3;
  return 99;
}

async function fetchJson(url, fallback = null) {
  try {
    const response = await fetch(`${url}?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    if (fallback !== null) return fallback;
    throw error;
  }
}

function buildResultsMap(payload) {
  const list = Array.isArray(payload) ? payload : (payload?.results || []);
  const map = new Map();

  for (const row of list) {
    const matchId = String(row.match_id || '').trim().toUpperCase();
    const outcome = normalizeSign(row.outcome || row.risultato);
    const finished = row.finished === true || String(row.status || '').toLowerCase() === 'finished';
    if (matchId && outcome && finished) map.set(matchId, outcome);
  }

  return map;
}

function buildSheets(predictions) {
  const days = new Map();

  for (const row of predictions) {
    const day = String(row.giornata || 'Giornata non indicata').trim();
    const participant = String(row.partecipante || '').trim();
    const match = String(row.match_id || '').trim().toUpperCase();
    const forecast = normalizeSign(row.pronostico);
    if (!participant || !match) continue;

    if (!days.has(day)) days.set(day, { matches: [], participants: new Map() });
    const sheet = days.get(day);
    if (!sheet.matches.includes(match)) sheet.matches.push(match);
    if (!sheet.participants.has(participant)) sheet.participants.set(participant, new Map());
    sheet.participants.get(participant).set(match, forecast);
  }

  return [...days.entries()].sort((a, b) => dayOrder(a[0]) - dayOrder(b[0]));
}

function cellClass(forecast, result) {
  if (!forecast || !result) return 'forecast';
  return forecast === result ? 'forecast is-correct' : 'forecast is-wrong';
}

function renderSheets(predictions, resultsMap) {
  const sheets = buildSheets(predictions);
  if (!sheets.length) {
    els.container.innerHTML = '<p>Nessun pronostico trovato.</p>';
    return;
  }

  els.container.innerHTML = sheets.map(([day, sheet], index) => {
    const participants = [...sheet.participants.keys()].sort((a, b) => a.localeCompare(b, 'it'));
    const header = sheet.matches.map(match => `<th class="match-head">${formatMatchHeader(match)}</th>`).join('');
    const resultRow = sheet.matches.map(match => {
      const value = resultsMap.get(match) || '';
      return `<td class="result-sign">${value ? escapeHtml(value) : '&nbsp;'}</td>`;
    }).join('');

    const rows = participants.map(name => {
      const forecasts = sheet.matches.map(match => {
        const value = sheet.participants.get(name).get(match) || '';
        const result = resultsMap.get(match) || '';
        return `<td class="${cellClass(value, result)}">${escapeHtml(value)}</td>`;
      }).join('');
      return `<tr><th class="participant-col" title="${escapeHtml(name)}">${escapeHtml(name)}</th>${forecasts}</tr>`;
    }).join('');

    return `
      <section class="sheet-block" data-sheet-index="${index}">
        <div class="sheet-title-row">
          <h2>${escapeHtml(day)}</h2>
          <span class="mobile-scroll-hint">Usa le frecce per scorrere le partite</span>
        </div>

        <div class="mobile-scroll-controls" aria-label="Controlli scorrimento ${escapeHtml(day)}">
          <button type="button" class="scroll-btn" data-dir="-1" aria-label="Scorri a sinistra">◀ Sinistra</button>
          <button type="button" class="scroll-btn" data-dir="1" aria-label="Scorri a destra">Destra ▶</button>
        </div>

        <div class="excel-wrap" tabindex="0">
          <table class="excel-table">
            <thead>
              <tr><th class="participant-col">Partecipanti</th>${header}</tr>
            </thead>
            <tbody>
              <tr class="result-row"><th class="participant-col">Risultato</th>${resultRow}</tr>
              ${rows}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }).join('');
}

function scrollSheet(button) {
  const block = button.closest('.sheet-block');
  const wrap = block?.querySelector('.excel-wrap');
  if (!wrap) return;

  const direction = Number(button.dataset.dir || 1);
  const participantCol = wrap.querySelector('.participant-col');
  const fixedWidth = participantCol ? participantCol.getBoundingClientRect().width : 90;
  const amount = Math.max(160, wrap.clientWidth - fixedWidth - 20);

  wrap.scrollBy({
    left: direction * amount,
    behavior: 'smooth'
  });
}

async function loadPredictions() {
  els.container.innerHTML = '<p>Caricamento riepilogo...</p>';
  try {
    const [predictions, rawResults] = await Promise.all([
      fetchJson(CONFIG.predictionsUrl, []),
      fetchJson(CONFIG.resultsUrl, { results: [] })
    ]);
    const resultsMap = buildResultsMap(rawResults);
    renderSheets(predictions, resultsMap);
    if (els.updatedAt) els.updatedAt.textContent = formatUpdatedAt(rawResults?.updated_at);
  } catch (error) {
    console.error(error);
    if (els.updatedAt) els.updatedAt.textContent = 'Errore';
    els.container.innerHTML = '<div class="error">Impossibile leggere i dati del riepilogo pronostici.</div>';
  }
}

document.addEventListener('click', event => {
  const button = event.target.closest('.scroll-btn');
  if (!button) return;
  scrollSheet(button);
});

els.reloadBtn?.addEventListener('click', loadPredictions);
loadPredictions();
