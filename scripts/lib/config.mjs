export const DATA_SOURCES = [
  {
    name: 'worldcup26.ir',
    url: 'https://worldcup26.ir/get/games',
    type: 'worldcup26'
  },
  {
    name: 'TheSportsDB',
    url: 'https://www.thesportsdb.com/api/v1/json/3/eventsseason.php?id=4429&s=2026',
    type: 'thesportsdb'
  },
  {
    name: 'GitHub raw worldcup2026 dataset',
    url: 'https://raw.githubusercontent.com/rezarahiminia/worldcup2026/main/worldcup2026.games.json',
    type: 'generic'
  },
  {
    name: 'football-data.org',
    url: 'https://api.football-data.org/v4/competitions/WC/matches?season=2026',
    type: 'football-data',
    tokenEnv: 'FOOTBALL_DATA_TOKEN'
  },
  {
    name: 'API-Football',
    url: 'https://v3.football.api-sports.io/fixtures?league=1&season=2026',
    type: 'api-football',
    tokenEnv: 'API_FOOTBALL_KEY'
  }
];

export const PREDICTIONS_FILE = 'data/pronostici.json';
export const OUTPUT_FILE = 'data/risultati-auto.json';
export const MAX_FETCH_ATTEMPTS = 3;
export const FETCH_TIMEOUT_MS = 25000;
export const LIVE_BEFORE_KICKOFF_MS = 10 * 60 * 1000;
export const LIVE_AFTER_KICKOFF_MS = 150 * 60 * 1000;
export const RECENT_FINISHED_WINDOW_MS = 2 * 60 * 60 * 1000;


export const MATCH_KICKOFF_UTC = {
  'MEX-SUD': '2026-06-11T19:00:00Z',
  'COR-CEC': '2026-06-12T02:00:00Z',
  'CAN-BOS': '2026-06-12T19:00:00Z',
  'USA-PAR': '2026-06-13T01:00:00Z',
  'QAT-SVI': '2026-06-13T19:00:00Z',
  'BRA-MAR': '2026-06-13T22:00:00Z',
  'HAI-SCO': '2026-06-14T01:00:00Z',
  'AUS-TUR': '2026-06-14T04:00:00Z',
  'GER-CURA': '2026-06-14T17:00:00Z',
  'NED-JAP': '2026-06-14T20:00:00Z',
  'CAV-ECU': '2026-06-14T23:00:00Z',
  'SVE-TUN': '2026-06-15T02:00:00Z',
  'SPA-CAVE': '2026-06-15T16:00:00Z',
  'BEL-EGI': '2026-06-15T19:00:00Z',
  'SAUDI-URU': '2026-06-15T22:00:00Z',
  'IRAN-NZEL': '2026-06-16T01:00:00Z',
  'FRA-SEN': '2026-06-16T19:00:00Z',
  'IRAQ-NOR': '2026-06-16T22:00:00Z',
  'ARG-ALG': '2026-06-17T01:00:00Z',
  'AUS-GIOR': '2026-06-17T04:00:00Z',
  'POR-CONGO': '2026-06-17T17:00:00Z',
  'ING-CROA': '2026-06-17T20:00:00Z',
  'GHA-PAN': '2026-06-17T23:00:00Z',
  'UZB-COL': '2026-06-18T02:00:00Z',
  'CEC-SUD': '2026-06-18T16:00:00Z',
  'SVI-BOS': '2026-06-18T19:00:00Z',
  'CAN-QAT': '2026-06-18T22:00:00Z',
  'MEX-COR': '2026-06-19T01:00:00Z',
  'USA-AUS': '2026-06-19T19:00:00Z',
  'SCO-MAR': '2026-06-19T22:00:00Z',
  'BRA-HAI': '2026-06-20T00:30:00Z',
  'TUR-PAR': '2026-06-20T03:00:00Z',
  'NED-SVE': '2026-06-20T17:00:00Z',
  'GER-CAV': '2026-06-20T20:00:00Z',
  'ECU-CURA': '2026-06-21T00:00:00Z',
  'TUN-JAP': '2026-06-21T04:00:00Z',
  'SPA-SAUDI': '2026-06-21T16:00:00Z',
  'BEL-IRAN': '2026-06-21T19:00:00Z',
  'URU-CAVE': '2026-06-21T22:00:00Z',
  'NZEL-EGI': '2026-06-22T01:00:00Z',
  'ARG-AUS': '2026-06-22T17:00:00Z',
  'FRA-IRAQ': '2026-06-22T21:00:00Z',
  'NOR-SEN': '2026-06-23T00:00:00Z',
  'GIOR-ALG': '2026-06-23T03:00:00Z',
  'POR-UZB': '2026-06-23T17:00:00Z',
  'ING-GHA': '2026-06-23T20:00:00Z',
  'PAN-CROA': '2026-06-23T23:00:00Z',
  'COL-CONGO': '2026-06-24T02:00:00Z',
  'SVI-CAN': '2026-06-24T19:00:00Z',
  'BOS-QAT': '2026-06-24T19:00:00Z',
  'SCO-BRA': '2026-06-24T22:00:00Z',
  'MAR-HAI': '2026-06-24T22:00:00Z',
  'CEC-MEX': '2026-06-25T01:00:00Z',
  'SUD-COR': '2026-06-25T01:00:00Z',
  'ECU-GER': '2026-06-25T20:00:00Z',
  'CURA-CAV': '2026-06-25T20:00:00Z',
  'TUN-NED': '2026-06-25T23:00:00Z',
  'JAP-SVE': '2026-06-25T23:00:00Z',
  'TUR-USA': '2026-06-26T02:00:00Z',
  'PAR-AUS': '2026-06-26T02:00:00Z',
  'NOR-FRA': '2026-06-26T19:00:00Z',
  'SEN-IRAQ': '2026-06-26T19:00:00Z',
  'URU-SPA': '2026-06-27T00:00:00Z',
  'CAVE-SAUDI': '2026-06-27T00:00:00Z',
  'NZEL-BEL': '2026-06-27T03:00:00Z',
  'EGI-IRAN': '2026-06-27T03:00:00Z',
  'PAN-ING': '2026-06-27T21:00:00Z',
  'CROA-GHA': '2026-06-27T21:00:00Z',
  'COL-POR': '2026-06-27T23:30:00Z',
  'CONGO-UZB': '2026-06-27T23:30:00Z',
  'GIOR-ARG': '2026-06-28T02:00:00Z',
  'ALG-AUS': '2026-06-28T02:00:00Z',
  'SUD-CAN': '2026-06-28T19:00:00Z',
  'BRA-JAP': '2026-06-29T17:00:00Z',
  'GER-PAR': '2026-06-29T20:30:00Z',
  'NED-MAR': '2026-06-30T01:00:00Z',
  'CAV-NOR': '2026-06-30T17:00:00Z',
  'FRA-SVE': '2026-06-30T21:00:00Z',
  'MEX-ECU': '2026-07-01T01:00:00Z',
  'ENG-CONGO': '2026-07-01T16:00:00Z',
  'BEL-SEN': '2026-07-01T20:00:00Z',
  'USA-BOS': '2026-07-02T00:00:00Z',
  'SPA-AUS': '2026-07-02T19:00:00Z',
  'POR-CRO': '2026-07-02T23:00:00Z',
  'SVI-ALG': '2026-07-03T03:00:00Z',
  'AUS-EGI': '2026-07-03T18:00:00Z',
  'ARG-CAVE': '2026-07-03T22:00:00Z',
  'COL-GHA': '2026-07-04T01:30:00Z'
};
