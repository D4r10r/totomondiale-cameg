const CONFIG = { predictionsUrl: 'data/pronostici.json' };

const els = {
  container: document.getElementById('predictionSheets'),
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

function dayOrder(day) {
  const d = String(day || '').toUpperCase();
  if (d.includes('PRIMA')) return 1;
  if (d.includes('SECONDA')) return 2;
  if (d.includes('TERZA')) return 3;
  return 99;
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function buildSheets(predictions) {
  const days = new Map();

  for (const row of predictions) {
    const day = String(row.giornata || 'Giornata non indicata').trim();
    const participant = String(row.partecipante || '').trim();
    const match = String(row.match_id || '').trim().toUpperCase();
    const forecast = String(row.pronostico || '').trim().toUpperCase();
    if (!participant || !match) continue;

    if (!days.has(day)) days.set(day, { matches: [], participants: new Map() });
    const sheet = days.get(day);
    if (!sheet.matches.includes(match)) sheet.matches.push(match);
    if (!sheet.participants.has(participant)) sheet.participants.set(participant, new Map());
    sheet.participants.get(participant).set(match, forecast);
  }

  return [...days.entries()].sort((a, b) => dayOrder(a[0]) - dayOrder(b[0]));
}

function renderSheets(predictions) {
  const sheets = buildSheets(predictions);
  if (!sheets.length) {
    els.container.innerHTML = '<p>Nessun pronostico trovato.</p>';
    return;
  }

  els.container.innerHTML = sheets.map(([day, sheet]) => {
    const participants = [...sheet.participants.keys()].sort((a, b) => a.localeCompare(b, 'it'));
    const header = sheet.matches.map(match => `<th class="match-head">${escapeHtml(match)}</th>`).join('');
    const rows = participants.map(name => {
      const forecasts = sheet.matches.map(match => {
        const value = sheet.participants.get(name).get(match) || '';
        return `<td class="forecast forecast-${escapeHtml(value)}">${escapeHtml(value)}</td>`;
      }).join('');
      return `<tr><th class="participant-col">${escapeHtml(name)}</th>${forecasts}</tr>`;
    }).join('');

    return `
      <section class="sheet-block">
        <h2>${escapeHtml(day)}</h2>
        <div class="excel-wrap">
          <table class="excel-table">
            <thead>
              <tr><th class="participant-col">Partecipanti</th>${header}</tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </section>
    `;
  }).join('');
}

async function loadPredictions() {
  els.container.innerHTML = '<p>Caricamento riepilogo...</p>';
  try {
    const predictions = await fetchJson(CONFIG.predictionsUrl);
    renderSheets(predictions);
  } catch (error) {
    console.error(error);
    els.container.innerHTML = '<div class="error">Impossibile leggere data/pronostici.json.</div>';
  }
}

els.reloadBtn.addEventListener('click', loadPredictions);
loadPredictions();
