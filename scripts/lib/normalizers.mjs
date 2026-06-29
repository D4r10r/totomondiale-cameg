import { LIVE_BEFORE_KICKOFF_MS, LIVE_AFTER_KICKOFF_MS } from './config.mjs';
import { firstDefined, scoreValue, outcomeFromScore } from './utils.mjs';

export function hasExplicitTimezone(raw) {
  return /(?:Z|[+-]\d{2}:?\d{2})$/i.test(String(raw).trim());
}

export function parseDateValueCandidates(value) {
  if (value === undefined || value === null || value === '') return [];

  if (typeof value === 'number') {
    const millis = value > 1000000000000 ? value : value * 1000;
    return Number.isFinite(millis) ? [millis] : [];
  }

  const raw = String(value).trim();
  if (!raw) return [];

  const numeric = Number(raw);
  if (Number.isFinite(numeric) && raw.length >= 10) {
    return [numeric > 1000000000000 ? numeric : numeric * 1000];
  }

  const normalized = raw.replace(' ', 'T');
  const direct = Date.parse(raw);
  if (!Number.isNaN(direct) && hasExplicitTimezone(raw)) return [direct];

  const out = [];
  const utc = Date.parse(`${normalized.replace(/Z$/i, '')}Z`);
  if (!Number.isNaN(utc)) {
    out.push(utc);
    out.push(utc + 4 * 60 * 60 * 1000); // EDT fallback for USA/Canada/Mexico local times in June.
    out.push(utc + 5 * 60 * 60 * 1000); // EST fallback.
  } else if (!Number.isNaN(direct)) {
    out.push(direct);
  }

  const italian = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (italian) {
    const [, day, month, year, hour = '0', minute = '0'] = italian;
    const base = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
    out.push(base, base + 4 * 60 * 60 * 1000, base + 5 * 60 * 60 * 1000);
  }

  return [...new Set(out)].filter(Number.isFinite);
}

export function kickoffCandidates(raw, sourceType) {
  const direct = firstDefined(
    raw.kickoff, raw.kickoff_time, raw.kickoffTime, raw.start_time, raw.startTime,
    raw.match_date, raw.matchDate, raw.datetime, raw.date_time, raw.utcDate,
    raw.local_date, raw.localDate, raw.dateEventLocal,
    raw.date, raw.fixture?.date, raw.fixture?.timestamp, raw.timestamp,
    raw.strTimestamp
  );

  const directCandidates = parseDateValueCandidates(direct);
  if (directCandidates.length) return directCandidates;

  if (sourceType === 'thesportsdb') {
    const date = firstDefined(raw.dateEvent, raw.dateEventLocal);
    const time = firstDefined(raw.strTime, raw.strTimeLocal);
    return parseDateValueCandidates(date && time ? `${date} ${time}` : date);
  }

  const datePart = firstDefined(raw.date, raw.match_date, raw.matchDate, raw.day, raw.dateEvent);
  const timePart = firstDefined(raw.start_hour, raw.startHour, raw.hour, raw.kickoff_hour, raw.kickoffHour, raw.strTime);
  return parseDateValueCandidates(datePart && timePart ? `${datePart} ${timePart}` : datePart);
}

export function bestKickoff(candidates, now = Date.now()) {
  if (!candidates.length) return null;
  const inWindow = candidates.find(ts => now >= ts - LIVE_BEFORE_KICKOFF_MS && now <= ts + LIVE_AFTER_KICKOFF_MS);
  if (inWindow) return inWindow;
  const future = candidates.filter(ts => ts > now).sort((a, b) => a - b)[0];
  if (future) return future;
  return candidates.slice().sort((a, b) => b - a)[0];
}

export function isFinishedStatus(...values) {
  return values.some(value => {
    const s = String(value ?? '').trim().toLowerCase();
    return ['true', '1', 'yes', 'finished', 'full_time', 'full time', 'ft', 'ended', 'completed', 'complete', 'final', 'played', 'match finished'].includes(s)
      || s.includes('finished') || s.includes('ended') || s.includes('full time');
  });
}

export function isLiveStatus(...values) {
  return values.some(value => {
    const s = String(value ?? '').trim().toLowerCase();
    return ['live', 'in_play', 'in play', 'playing', '1h', '2h', 'ht', 'halftime', 'first half', 'second half'].includes(s)
      || s.includes('live') || s.includes('in play') || s.includes('first half') || s.includes('second half');
  });
}

export function normalizeWorldcup26Game(raw) {
  const home = firstDefined(teamName(raw, 'home'), teamCode(raw, 'home'));
  const away = firstDefined(teamName(raw, 'away'), teamCode(raw, 'away'));
  const homeScore = scoreValue(firstDefined(raw.home_score, raw.homeScore, raw.home_goals, raw.homeGoals, raw.score_home, raw.home_team_score, raw.homeTeamScore, raw.home?.score, raw.home?.goals, raw.goals?.home, raw.score?.home, raw.result?.home, raw.result?.home_score));
  const awayScore = scoreValue(firstDefined(raw.away_score, raw.awayScore, raw.away_goals, raw.awayGoals, raw.score_away, raw.away_team_score, raw.awayTeamScore, raw.away?.score, raw.away?.goals, raw.goals?.away, raw.score?.away, raw.result?.away, raw.result?.away_score));
  const finished = isFinishedStatus(raw.finished, raw.is_finished, raw.completed, raw.isCompleted, raw.played, raw.isPlayed, raw.status, raw.match_status, raw.state, raw.status_en, raw.fixture?.status?.short, raw.fixture?.status?.long);
  const explicitLive = !finished && isLiveStatus(raw.live, raw.is_live, raw.in_play, raw.isInPlay, raw.status, raw.match_status, raw.state, raw.status_en, raw.fixture?.status?.short, raw.fixture?.status?.long);
  const kickoff_ts_candidates = kickoffCandidates(raw, 'worldcup26');
  const kickoff_ts = bestKickoff(kickoff_ts_candidates);
  const liveByTime = !finished && kickoff_ts_candidates.some(ts => Date.now() >= ts - LIVE_BEFORE_KICKOFF_MS && Date.now() <= ts + LIVE_AFTER_KICKOFF_MS);
  const live = explicitLive || liveByTime;
  const minute = matchMinute(raw, { finished, live });
  const outcome = finished ? outcomeFromScore(homeScore, awayScore) : null;
  return { home, away, homeScore, awayScore, finished, live, minute, outcome, kickoff_ts };
}

export function normalizeTheSportsDbGame(raw) {
  const home = firstDefined(raw.strHomeTeam, raw.strHomeTeamShort, raw.homeTeam, raw.home);
  const away = firstDefined(raw.strAwayTeam, raw.strAwayTeamShort, raw.awayTeam, raw.away);
  const homeScore = scoreValue(firstDefined(raw.intHomeScore, raw.home_score, raw.homeScore));
  const awayScore = scoreValue(firstDefined(raw.intAwayScore, raw.away_score, raw.awayScore));
  const status = firstDefined(raw.strStatus, raw.status, raw.strProgress);
  const finished = isFinishedStatus(status) || (homeScore !== null && awayScore !== null && String(status || '').toLowerCase().includes('match finished'));
  const explicitLive = !finished && isLiveStatus(status, raw.strProgress);
  const kickoff_ts_candidates = kickoffCandidates(raw, 'thesportsdb');
  const kickoff_ts = bestKickoff(kickoff_ts_candidates);
  const liveByTime = !finished && kickoff_ts_candidates.some(ts => Date.now() >= ts - LIVE_BEFORE_KICKOFF_MS && Date.now() <= ts + LIVE_AFTER_KICKOFF_MS);
  const live = explicitLive || liveByTime;
  const minute = finished ? 'FT' : (explicitLive ? 'Live' : (liveByTime ? 'Live' : ''));
  const outcome = finished ? outcomeFromScore(homeScore, awayScore) : null;
  return { home, away, homeScore, awayScore, finished, live, minute, outcome, kickoff_ts };
}

export function normalizeFootballDataGame(raw) {
  const home = firstDefined(raw.homeTeam?.name, raw.homeTeam?.shortName, raw.homeTeam?.tla);
  const away = firstDefined(raw.awayTeam?.name, raw.awayTeam?.shortName, raw.awayTeam?.tla);
  const homeScore = scoreValue(firstDefined(raw.score?.fullTime?.home, raw.score?.regularTime?.home, raw.score?.halfTime?.home));
  const awayScore = scoreValue(firstDefined(raw.score?.fullTime?.away, raw.score?.regularTime?.away, raw.score?.halfTime?.away));
  const status = raw.status;
  const finished = isFinishedStatus(status) || String(status || '').toUpperCase() === 'FINISHED';
  const explicitLive = !finished && ['IN_PLAY', 'PAUSED'].includes(String(status || '').toUpperCase());
  const kickoff_ts_candidates = kickoffCandidates(raw, 'football-data');
  const kickoff_ts = bestKickoff(kickoff_ts_candidates);
  const liveByTime = !finished && kickoff_ts_candidates.some(ts => Date.now() >= ts - LIVE_BEFORE_KICKOFF_MS && Date.now() <= ts + LIVE_AFTER_KICKOFF_MS);
  const live = explicitLive || liveByTime;
  const minute = finished ? 'FT' : (explicitLive ? 'Live' : (liveByTime ? 'Live' : ''));
  const outcome = finished ? outcomeFromScore(homeScore, awayScore) : null;
  return { home, away, homeScore, awayScore, finished, live, minute, outcome, kickoff_ts };
}

export function normalizeApiFootballGame(raw) {
  const home = firstDefined(raw.teams?.home?.name, raw.home?.name);
  const away = firstDefined(raw.teams?.away?.name, raw.away?.name);
  const homeScore = scoreValue(firstDefined(raw.goals?.home, raw.score?.fulltime?.home, raw.score?.halftime?.home));
  const awayScore = scoreValue(firstDefined(raw.goals?.away, raw.score?.fulltime?.away, raw.score?.halftime?.away));
  const statusShort = raw.fixture?.status?.short;
  const statusLong = raw.fixture?.status?.long;
  const finished = ['FT', 'AET', 'PEN'].includes(String(statusShort || '').toUpperCase()) || isFinishedStatus(statusLong);
  const explicitLive = !finished && ['1H', '2H', 'HT', 'ET', 'BT', 'P'].includes(String(statusShort || '').toUpperCase());
  const kickoff_ts_candidates = kickoffCandidates(raw, 'api-football');
  const kickoff_ts = bestKickoff(kickoff_ts_candidates);
  const liveByTime = !finished && kickoff_ts_candidates.some(ts => Date.now() >= ts - LIVE_BEFORE_KICKOFF_MS && Date.now() <= ts + LIVE_AFTER_KICKOFF_MS);
  const live = explicitLive || liveByTime;
  const elapsed = Number(raw.fixture?.status?.elapsed);
  const minute = finished ? 'FT' : (Number.isFinite(elapsed) && elapsed > 0 ? `${elapsed}'` : (live ? 'Live' : ''));
  const outcome = finished ? outcomeFromScore(homeScore, awayScore) : null;
  return { home, away, homeScore, awayScore, finished, live, minute, outcome, kickoff_ts };
}

export function teamName(raw, side) {
  return firstDefined(
    raw[`${side}_team_name_en`], raw[`${side}_team_name`], raw[`${side}_team`], raw[`${side}TeamName`], raw[`${side}Team`],
    raw[side]?.name_en, raw[side]?.name, raw[side]?.team_name, raw[side]?.team,
    raw.teams?.[side]?.name_en, raw.teams?.[side]?.name, raw.teams?.[side]?.team,
    raw[`${side}_name`]
  );
}

export function teamCode(raw, side) {
  return firstDefined(
    raw[`${side}_team_code`], raw[`${side}_team_fifa_code`], raw[`${side}TeamCode`],
    raw[side]?.fifa_code, raw[side]?.code, raw.teams?.[side]?.fifa_code, raw.teams?.[side]?.code
  );
}

export function matchMinute(raw, game) {
  if (game.finished) return 'FT';
  const value = firstDefined(raw.minute, raw.elapsed, raw.match_minute, raw.time, raw.fixture?.status?.elapsed);
  const n = Number(value);
  if (Number.isFinite(n) && n > 0) return `${n}'`;
  return game.live ? 'Live' : '';
}

export function normalizeGame(raw, sourceType) {
  if (sourceType === 'thesportsdb') return normalizeTheSportsDbGame(raw);
  if (sourceType === 'football-data') return normalizeFootballDataGame(raw);
  if (sourceType === 'api-football') return normalizeApiFootballGame(raw);
  return normalizeWorldcup26Game(raw);
}
