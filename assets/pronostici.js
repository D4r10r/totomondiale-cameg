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


const TEAM_DISPLAY = {
  ALG: { name: 'Algeria', flag: 'dz' },
  ARG: { name: 'Argentina', flag: 'ar' },
  AUS: { name: 'Australia', flag: 'au' },
  AUT: { name: 'Austria', flag: 'at' },
  BEL: { name: 'Belgio', flag: 'be' },
  BOS: { name: 'Bosnia', flag: 'ba' },
  BRA: { name: 'Brasile', flag: 'br' },
  CAN: { name: 'Canada', flag: 'ca' },
  CAV: { name: "Costa d'Avorio", flag: 'ci' },
  CAVE: { name: 'Capo Verde', flag: 'cv' },
  COL: { name: 'Colombia', flag: 'co' },
  CONGO: { name: 'RD Congo', flag: 'cd' },
  COR: { name: 'Corea del Sud', flag: 'kr' },
  CRO: { name: 'Croazia', flag: 'hr' },
  CROA: { name: 'Croazia', flag: 'hr' },
  CURA: { name: 'Curaçao', flag: 'cw' },
  CEC: { name: 'Cechia', flag: 'cz' },
  EGI: { name: 'Egitto', flag: 'eg' },
  ECU: { name: 'Ecuador', flag: 'ec' },
  ENG: { name: 'Inghilterra', flag: 'gb-eng' },
  FRA: { name: 'Francia', flag: 'fr' },
  GER: { name: 'Germania', flag: 'de' },
  GHA: { name: 'Ghana', flag: 'gh' },
  GIOR: { name: 'Giordania', flag: 'jo' },
  HAI: { name: 'Haiti', flag: 'ht' },
  ING: { name: 'Inghilterra', flag: 'gb-eng' },
  IRAN: { name: 'Iran', flag: 'ir' },
  IRAQ: { name: 'Iraq', flag: 'iq' },
  JAP: { name: 'Giappone', flag: 'jp' },
  MAR: { name: 'Marocco', flag: 'ma' },
  MEX: { name: 'Messico', flag: 'mx' },
  NED: { name: 'Paesi Bassi', flag: 'nl' },
  NOR: { name: 'Norvegia', flag: 'no' },
  NZEL: { name: 'Nuova Zelanda', flag: 'nz' },
  PAN: { name: 'Panama', flag: 'pa' },
  PAR: { name: 'Paraguay', flag: 'py' },
  POR: { name: 'Portogallo', flag: 'pt' },
  QAT: { name: 'Qatar', flag: 'qa' },
  SAUDI: { name: 'Arabia Saudita', flag: 'sa' },
  SCO: { name: 'Scozia', flag: 'gb-sct' },
  SEN: { name: 'Senegal', flag: 'sn' },
  SPA: { name: 'Spagna', flag: 'es' },
  SUD: { name: 'Sudafrica', flag: 'za' },
  SVE: { name: 'Svezia', flag: 'se' },
  SVI: { name: 'Svizzera', flag: 'ch' },
  TUN: { name: 'Tunisia', flag: 'tn' },
  TUR: { name: 'Turchia', flag: 'tr' },
  URU: { name: 'Uruguay', flag: 'uy' },
  USA: { name: 'Stati Uniti', flag: 'us' },
  UZB: { name: 'Uzbekistan', flag: 'uz' }
};

function teamDisplay(code) {
  const key = String(code || '').trim().toUpperCase();
  return TEAM_DISPLAY[key] || { name: key, flag: '' };
}

function renderHeaderTeam(code) {
  const team = teamDisplay(code);
  const flag = team.flag
    ? `<img class="pron-flag" src="assets/flags/${escapeHtml(team.flag)}.svg" alt="" loading="lazy" onerror="this.style.display='none'">`
    : '';

  return `
    <span class="match-team">
      ${flag}
      <span class="match-team-name">${escapeHtml(team.name)}</span>
    </span>
  `;
}

function formatMatchHeader(match) {
  const parts = String(match || '').split('-').map(x => x.trim()).filter(Boolean);

  if (parts.length >= 2) {
    const home = parts[0];
    const away = parts.slice(1).join('-');

    return `
      <div class="match-header-full">
        ${renderHeaderTeam(home)}
        <span class="match-divider"></span>
        ${renderHeaderTeam(away)}
      </div>
    `;
  }

  return escapeHtml(match);
}

function dayOrder(day) {
  const d = String(day || '').toUpperCase();
  if (d.includes('PRIMA')) return 1;
  if (d.includes('SECONDA')) return 2;
  if (d.includes('TERZA')) return 3;
  if (d.includes('SEDICESIMI')) return 4;
  return 99;
}

function isGroupStageDay(day) {
  const d = String(day || '').toUpperCase();
  return d.includes('PRIMA') || d.includes('SECONDA') || d.includes('TERZA');
}

function cleanDayTitle(day) {
  return String(day || '').trim().toUpperCase();
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

function renderSheetTable(day, sheet, index) {
  const participants = [...sheet.participants.keys()].sort((a, b) => a.localeCompare(b, 'it'));
  const header = sheet.matches.map(match => `<th class="match-head">${formatMatchHeader(match)}</th>`).join('');
  const resultRow = sheet.matches.map(match => {
    const value = resultsMapGlobal.get(match) || '';
    return `<td class="result-sign">${value ? escapeHtml(value) : '&nbsp;'}</td>`;
  }).join('');

  const rows = participants.map(name => {
    const forecasts = sheet.matches.map(match => {
      const value = sheet.participants.get(name).get(match) || '';
      const result = resultsMapGlobal.get(match) || '';
      return `<td class="${cellClass(value, result)}">${escapeHtml(value)}</td>`;
    }).join('');
    return `<tr><th class="participant-col" title="${escapeHtml(name)}">${escapeHtml(name)}</th>${forecasts}</tr>`;
  }).join('');

  return `
    <div class="sheet-title-row">
      <h2>${escapeHtml(cleanDayTitle(day))}</h2>
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
  `;
}

let resultsMapGlobal = new Map();

function renderSheets(predictions, resultsMap) {
  resultsMapGlobal = resultsMap;
  const sheets = buildSheets(predictions);
  if (!sheets.length) {
    els.container.innerHTML = '<p>Nessun pronostico trovato.</p>';
    return;
  }

  const groupSheets = sheets.filter(([day]) => isGroupStageDay(day));
  const knockoutSheets = sheets.filter(([day]) => !isGroupStageDay(day));

  const groupHtml = groupSheets.length
    ? `<div class="stage-heading">FASE A GIRONI</div>` + groupSheets.map(([day, sheet], index) => {
      const content = renderSheetTable(day, sheet, index);
      return `
        <details class="sheet-block sheet-accordion" data-sheet-index="${index}">
          <summary class="sheet-accordion-summary">
            <span>${escapeHtml(cleanDayTitle(day))}</span>
            <span class="accordion-plus" aria-hidden="true">+</span>
          </summary>
          <div class="sheet-accordion-content">
            ${content}
          </div>
        </details>
      `;
    }).join('')
    : '';

  const knockoutHtml = knockoutSheets.map(([day, sheet], index) => {
    const sheetIndex = groupSheets.length + index;
    const content = renderSheetTable(day, sheet, sheetIndex);
    return `
      <section class="sheet-block sheet-block-open" data-sheet-index="${sheetIndex}">
        <div class="stage-heading stage-heading-open">${escapeHtml(cleanDayTitle(day)) === 'SEDICESIMI' ? 'SEDICESIMI DI FINALE' : escapeHtml(cleanDayTitle(day))}</div>
        ${content}
      </section>
    `;
  }).join('');

  els.container.innerHTML = groupHtml + knockoutHtml;
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
