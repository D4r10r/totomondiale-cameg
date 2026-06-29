import { DATA_SOURCES, MAX_FETCH_ATTEMPTS, FETCH_TIMEOUT_MS } from './config.mjs';
import { firstDefined } from './utils.mjs';

export function sourceHeaders(source) {
  const headers = { accept: 'application/json' };
  if (source.name === 'football-data.org' && process.env.FOOTBALL_DATA_TOKEN) {
    headers['X-Auth-Token'] = process.env.FOOTBALL_DATA_TOKEN;
  }
  if (source.name === 'API-Football' && process.env.API_FOOTBALL_KEY) {
    headers['x-apisports-key'] = process.env.API_FOOTBALL_KEY;
  }
  return headers;
}

export function sourceIsUsable(source) {
  return !source.tokenEnv || Boolean(process.env[source.tokenEnv]);
}

export function extractArray(payload, sourceType) {
  if (Array.isArray(payload)) return payload;
  if (sourceType === 'thesportsdb') return payload?.events || [];
  if (sourceType === 'football-data') return payload?.matches || [];
  if (sourceType === 'api-football') return payload?.response || [];
  return firstDefined(payload.games, payload.data, payload.matches, payload.results, payload.items, payload.events, payload.response, []);
}

export async function fetchJsonFromSource(source) {
  if (!sourceIsUsable(source)) {
    throw new Error(`Sorgente saltata: manca secret ${source.tokenEnv}`);
  }

  let lastError = null;

  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(source.url, {
        headers: sourceHeaders(source),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      console.log(`${source.name}: tentativo ${attempt}/${MAX_FETCH_ATTEMPTS} fallito: ${error?.message || error}`);
      if (attempt < MAX_FETCH_ATTEMPTS) await new Promise(resolve => setTimeout(resolve, attempt * 3000));
    }
  }

  throw lastError || new Error('Fetch fallito');
}

export async function loadGamesFromSources() {
  const errors = [];

  for (const source of DATA_SOURCES) {
    try {
      const payload = await fetchJsonFromSource(source);
      const games = extractArray(payload, source.type);
      if (!Array.isArray(games) || !games.length) throw new Error('Payload senza partite utilizzabili');
      console.log(`Sorgente attiva: ${source.name} (${games.length} partite lette)`);
      return { source, games };
    } catch (error) {
      errors.push(`${source.name}: ${error?.message || error}`);
      console.log(`Sorgente non disponibile: ${source.name} - ${error?.message || error}`);
    }
  }

  throw new Error(`Nessuna sorgente disponibile. ${errors.join(' | ')}`);
}
