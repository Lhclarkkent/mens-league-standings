// scrape.js
// Pulls standings + rosters from public ESPN fantasy football leagues
// and writes them to docs/data.json for the static site to read.
//
// Config comes from environment variables (set as GitHub Actions repo
// variables so you never have to edit code to change a league ID):
//   SEASON        e.g. "2026"
//   LEAGUE_A_ID   ESPN league ID for Division A
//   LEAGUE_B_ID   ESPN league ID for Division B
//   LEAGUE_C_ID   ESPN league ID for Division C
//   LEAGUE_A_LABEL, LEAGUE_B_LABEL, LEAGUE_C_LABEL   optional display names
//
// Leagues MUST be set to public in ESPN league settings or this will
// return 401s.

import { writeFile } from "fs/promises";

const SEASON = process.env.SEASON || String(new Date().getFullYear());

const DIVISIONS = [
  { key: "A", id: process.env.LEAGUE_A_ID, label: process.env.LEAGUE_A_LABEL || "Division A", color: "#C9A227" },
  { key: "B", id: process.env.LEAGUE_B_ID, label: process.env.LEAGUE_B_LABEL || "Division B", color: "#5C8A72" },
  { key: "C", id: process.env.LEAGUE_C_ID, label: process.env.LEAGUE_C_LABEL || "Division C", color: "#BC4B2C" },
].filter((d) => d.id && d.id.trim().length > 0);

// Standard ESPN position + pro team lookups
const POSITION_MAP = {
  0: "QB", 1: "TQB", 2: "RB", 3: "RB/WR", 4: "WR", 5: "WR/TE", 6: "TE",
  7: "OP", 8: "DT", 9: "DE", 10: "LB", 11: "DL", 12: "CB", 13: "S",
  14: "DB", 15: "DP", 16: "D/ST", 17: "K", 18: "P", 19: "HC",
  20: "BE", 21: "IR", 23: "FLEX",
};

const PRO_TEAM_MAP = {
  0: "FA", 1: "ATL", 2: "BUF", 3: "CHI", 4: "CIN", 5: "CLE", 6: "DAL",
  7: "DEN", 8: "DET", 9: "GB", 10: "TEN", 11: "IND", 12: "KC", 13: "LV",
  14: "LAR", 15: "MIA", 16: "MIN", 17: "NE", 18: "NO", 19: "NYG",
  20: "NYJ", 21: "PHI", 22: "ARI", 23: "PIT", 24: "LAC", 25: "SF",
  26: "SEA", 27: "TB", 28: "WSH", 29: "CAR", 30: "JAX", 33: "BAL", 34: "HOU",
};

async function fetchLeague(division) {
  const url = `https://fantasy.espn.com/apis/v3/games/ffl/seasons/${SEASON}/segments/0/leagues/${division.id}?view=mStandings&view=mTeam&view=mRoster`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (league-standings-bot)" },
  });
  if (!res.ok) {
    throw new Error(`League ${division.id} (${division.label}) responded ${res.status}`);
  }
  const data = await res.json();

  const teams = (data.teams || []).map((t) => {
    const record = t.record?.overall || {};
    const wins = record.wins || 0;
    const losses = record.losses || 0;
    const ties = record.ties || 0;
    const games = wins + losses + ties;
    const winPct = games > 0 ? (wins + ties * 0.5) / games : 0;
    const name = t.location && t.nickname ? `${t.location} ${t.nickname}`.trim() : t.name || `Team ${t.id}`;

    const roster = (t.roster?.entries || []).map((entry) => {
      const p = entry.playerPoolEntry?.player || {};
      return {
        name: p.fullName || "Unknown",
        position: POSITION_MAP[p.defaultPositionId] || "?",
        proTeam: PRO_TEAM_MAP[p.proTeamId] ?? "FA",
        slot: POSITION_MAP[entry.lineupSlotId] || "BE",
      };
    });

    return {
      id: t.id,
      name,
      wins,
      losses,
      ties,
      winPct,
      pointsFor: record.pointsFor ?? 0,
      pointsAgainst: record.pointsAgainst ?? 0,
      roster,
    };
  });

  return { key: division.key, label: division.label, color: division.color, teams };
}

async function main() {
  if (DIVISIONS.length === 0) {
    throw new Error("No league IDs configured. Set LEAGUE_A_ID / LEAGUE_B_ID / LEAGUE_C_ID.");
  }

  const results = [];
  const errors = [];

  for (const division of DIVISIONS) {
    try {
      const result = await fetchLeague(division);
      results.push(result);
      console.log(`Fetched ${division.label}: ${result.teams.length} teams`);
    } catch (err) {
      console.error(`Failed to fetch ${division.label}:`, err.message);
      errors.push({ division: division.label, error: err.message });
    }
  }

  const output = {
    generatedAt: new Date().toISOString(),
    season: SEASON,
    divisions: results,
    errors,
  };

  await writeFile("docs/data.json", JSON.stringify(output, null, 2));
  console.log("Wrote docs/data.json");

  if (results.length === 0) {
    process.exit(1); // fail the Action if nothing came back at all
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
