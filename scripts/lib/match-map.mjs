import { OVERRIDE_MATCH_NAMES } from './config.mjs';
import { makeTeamKey, possibleNamesForCode } from './utils.mjs';

export function buildMatchMap(predictions) {
  const uniqueIds = [...new Set(predictions.map(p => String(p.match_id || '').trim().toUpperCase()).filter(Boolean))];
  const map = new Map();

  for (const matchId of uniqueIds) {
    let homeNames;
    let awayNames;

    if (OVERRIDE_MATCH_NAMES[matchId]) {
      [homeNames, awayNames] = [[OVERRIDE_MATCH_NAMES[matchId][0]], [OVERRIDE_MATCH_NAMES[matchId][1]]];
    } else {
      const [homeCode, awayCode] = matchId.split('-');
      homeNames = possibleNamesForCode(homeCode);
      awayNames = possibleNamesForCode(awayCode);
    }

    for (const home of homeNames) {
      for (const away of awayNames) {
        map.set(makeTeamKey(home, away), { match_id: matchId, reverse: false, order: uniqueIds.indexOf(matchId) });
        map.set(makeTeamKey(away, home), { match_id: matchId, reverse: true, order: uniqueIds.indexOf(matchId) });
      }
    }
  }

  return map;
}
