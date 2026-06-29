import { TEAM_FLAGS, TEAM_NAMES } from './config.mjs';

export function stripAccents(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function normalizeText(value) {
  return stripAccents(value).toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
}

export function flagForTeam(teamName) {
  return TEAM_FLAGS[normalizeText(teamName)] || '';
}

export function makeTeamKey(home, away) {
  return `${normalizeText(home)}|${normalizeText(away)}`;
}

export function invertOutcome(outcome) {
  if (outcome === '1') return '2';
  if (outcome === '2') return '1';
  return outcome;
}

export function possibleNamesForCode(code) {
  return TEAM_NAMES[code] || [code];
}

export function firstDefined(...values) {
  return values.find(v => v !== undefined && v !== null && v !== '');
}

export function scoreValue(value) {
  const raw = firstDefined(value?.current, value?.total, value?.goals, value?.score, value);
  if (raw === undefined || raw === null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function outcomeFromScore(homeScore, awayScore) {
  if (homeScore === null || awayScore === null) return null;
  if (homeScore > awayScore) return '1';
  if (homeScore < awayScore) return '2';
  return 'X';
}
