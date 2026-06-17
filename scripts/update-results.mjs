import { writeFile, mkdir } from 'node:fs/promises';

const OUTPUT = 'data/risultati-auto.json';
const GAMES_URL = 'https://worldcup26.ir/get/games';
const TEAMS_URL = 'https://worldcup26.ir/get/teams';

async function fetchJson(url, timeoutMs = 20000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { 'accept': 'application/json' } });
    if (!response.ok) throw new Error(`${url} HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  await mkdir('data', { recursive: true });
  const result = {
    updated_at: new Date().toISOString(),
    ok: false,
    source: GAMES_URL,
    games: [],
    teams: [],
    error: null
  };

  try {
    result.games = await fetchJson(GAMES_URL);
    try {
      result.teams = await fetchJson(TEAMS_URL);
    } catch (teamError) {
      result.teams = [];
      result.team_error = String(teamError?.message || teamError);
    }
    result.ok = true;
  } catch (error) {
    result.error = String(error?.message || error);
  }

  await writeFile(OUTPUT, JSON.stringify(result, null, 2), 'utf8');
  console.log(`Wrote ${OUTPUT}. ok=${result.ok}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
