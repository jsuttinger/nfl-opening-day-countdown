// Static reference data for all 32 NFL teams.
// Live schedule/game data is fetched at runtime from ESPN's public API (see app.js) —
// only stable metadata (IDs, names, colors, official sites) lives here.
const TEAMS = [
  { id: "22", abbr: "ARI", name: "Arizona Cardinals",     conf: "NFC", div: "West",  color: "#97233F", site: "https://www.azcardinals.com" },
  { id: "1",  abbr: "ATL", name: "Atlanta Falcons",       conf: "NFC", div: "South", color: "#A71930", site: "https://www.atlantafalcons.com" },
  { id: "33", abbr: "BAL", name: "Baltimore Ravens",      conf: "AFC", div: "North", color: "#241773", site: "https://www.baltimoreravens.com" },
  { id: "2",  abbr: "BUF", name: "Buffalo Bills",         conf: "AFC", div: "East",  color: "#00338D", site: "https://www.buffalobills.com" },
  { id: "29", abbr: "CAR", name: "Carolina Panthers",     conf: "NFC", div: "South", color: "#0085CA", site: "https://www.panthers.com" },
  { id: "3",  abbr: "CHI", name: "Chicago Bears",         conf: "NFC", div: "North", color: "#0B162A", site: "https://www.chicagobears.com" },
  { id: "4",  abbr: "CIN", name: "Cincinnati Bengals",    conf: "AFC", div: "North", color: "#FB4F14", site: "https://www.bengals.com" },
  { id: "5",  abbr: "CLE", name: "Cleveland Browns",      conf: "AFC", div: "North", color: "#311D00", site: "https://www.clevelandbrowns.com" },
  { id: "6",  abbr: "DAL", name: "Dallas Cowboys",        conf: "NFC", div: "East",  color: "#003594", site: "https://www.dallascowboys.com" },
  { id: "7",  abbr: "DEN", name: "Denver Broncos",        conf: "AFC", div: "West",  color: "#FB4F14", site: "https://www.denverbroncos.com" },
  { id: "8",  abbr: "DET", name: "Detroit Lions",         conf: "NFC", div: "North", color: "#0076B6", site: "https://www.detroitlions.com" },
  { id: "9",  abbr: "GB",  name: "Green Bay Packers",     conf: "NFC", div: "North", color: "#203731", site: "https://www.packers.com" },
  { id: "34", abbr: "HOU", name: "Houston Texans",        conf: "AFC", div: "South", color: "#03202F", site: "https://www.houstontexans.com" },
  { id: "11", abbr: "IND", name: "Indianapolis Colts",    conf: "AFC", div: "South", color: "#002C5F", site: "https://www.colts.com" },
  { id: "30", abbr: "JAX", name: "Jacksonville Jaguars",  conf: "AFC", div: "South", color: "#006778", site: "https://www.jaguars.com" },
  { id: "12", abbr: "KC",  name: "Kansas City Chiefs",    conf: "AFC", div: "West",  color: "#E31837", site: "https://www.chiefs.com" },
  { id: "13", abbr: "LV",  name: "Las Vegas Raiders",     conf: "AFC", div: "West",  color: "#000000", site: "https://www.raiders.com" },
  { id: "24", abbr: "LAC", name: "Los Angeles Chargers",  conf: "AFC", div: "West",  color: "#0080C6", site: "https://www.chargers.com" },
  { id: "14", abbr: "LAR", name: "Los Angeles Rams",      conf: "NFC", div: "West",  color: "#003594", site: "https://www.therams.com" },
  { id: "15", abbr: "MIA", name: "Miami Dolphins",        conf: "AFC", div: "East",  color: "#008E97", site: "https://www.miamidolphins.com" },
  { id: "16", abbr: "MIN", name: "Minnesota Vikings",     conf: "NFC", div: "North", color: "#4F2683", site: "https://www.vikings.com" },
  { id: "17", abbr: "NE",  name: "New England Patriots",  conf: "AFC", div: "East",  color: "#002244", site: "https://www.patriots.com" },
  { id: "18", abbr: "NO",  name: "New Orleans Saints",    conf: "NFC", div: "South", color: "#D3BC8D", site: "https://www.neworleanssaints.com" },
  { id: "19", abbr: "NYG", name: "New York Giants",       conf: "NFC", div: "East",  color: "#0B2265", site: "https://www.giants.com" },
  { id: "20", abbr: "NYJ", name: "New York Jets",         conf: "AFC", div: "East",  color: "#125740", site: "https://www.newyorkjets.com" },
  { id: "21", abbr: "PHI", name: "Philadelphia Eagles",   conf: "NFC", div: "East",  color: "#004C54", site: "https://www.philadelphiaeagles.com" },
  { id: "23", abbr: "PIT", name: "Pittsburgh Steelers",   conf: "AFC", div: "North", color: "#FFB612", site: "https://www.steelers.com" },
  { id: "25", abbr: "SF",  name: "San Francisco 49ers",   conf: "NFC", div: "West",  color: "#AA0000", site: "https://www.49ers.com" },
  { id: "26", abbr: "SEA", name: "Seattle Seahawks",      conf: "NFC", div: "West",  color: "#002244", site: "https://www.seahawks.com" },
  { id: "27", abbr: "TB",  name: "Tampa Bay Buccaneers",  conf: "NFC", div: "South", color: "#D50A0A", site: "https://www.buccaneers.com" },
  { id: "10", abbr: "TEN", name: "Tennessee Titans",      conf: "AFC", div: "South", color: "#4B92DB", site: "https://www.tennesseetitans.com" },
  { id: "28", abbr: "WSH", name: "Washington Commanders", conf: "NFC", div: "East",  color: "#5A1414", site: "https://www.commanders.com" },
];

const TEAMS_BY_ID = Object.fromEntries(TEAMS.map((t) => [t.id, t]));
const TEAMS_BY_ABBR = Object.fromEntries(TEAMS.map((t) => [t.abbr, t]));

function teamLogoUrl(abbr) {
  return `https://a.espncdn.com/i/teamlogos/nfl/500/${abbr.toLowerCase()}.png`;
}
