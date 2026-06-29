import { MATCH_KICKOFF_UTC, LIVE_BEFORE_KICKOFF_MS, LIVE_AFTER_KICKOFF_MS, OVERRIDE_MATCH_NAMES } from './config.mjs';
import { possibleNamesForCode, flagForTeam } from './utils.mjs';

export function scheduledKickoff(matchId) {
  const value = MATCH_KICKOFF_UTC[String(matchId || '').trim().toUpperCase()];
  if (!value) return null;
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : null;
}

export function isLiveByScheduledKickoff(matchId, now = Date.now()) {
  const ts = scheduledKickoff(matchId);
  return ts !== null && now >= ts - LIVE_BEFORE_KICKOFF_MS && now <= ts + LIVE_AFTER_KICKOFF_MS;
}

export function displayNamesForMatchId(matchId) {
  const id = String(matchId || '').trim().toUpperCase();

  if (OVERRIDE_MATCH_NAMES[id]) {
    return {
      home: OVERRIDE_MATCH_NAMES[id][0],
      away: OVERRIDE_MATCH_NAMES[id][1]
    };
  }

  const [homeCode, awayCode] = id.split('-');
  return {
    home: possibleNamesForCode(homeCode)[0] || homeCode,
    away: possibleNamesForCode(awayCode)[0] || awayCode
  };
}

export function scheduledWidgetFixtures() {
  return Object.entries(MATCH_KICKOFF_UTC).map(([matchId, kickoff]) => {
    const names = displayNamesForMatchId(matchId);
    const kickoffTs = Date.parse(kickoff);

    return {
      match_id: matchId,
      home: names.home,
      away: names.away,
      homeScore: null,
      awayScore: null,
      home_flag: flagForTeam(names.home),
      away_flag: flagForTeam(names.away),
      minute: 'Prossima',
      finished: false,
      live: isLiveByScheduledKickoff(matchId),
      kickoff_ts: Number.isFinite(kickoffTs) ? kickoffTs : null,
      order: 9999
    };
  });
}
