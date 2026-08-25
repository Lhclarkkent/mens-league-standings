// scrape.js
// Pulls standings and rosters from public ESPN fantasy football leagues
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
// Leagues MUST be set to public in ESPN league settings or this will fail.

import { writeFile, mkdir } from "fs/promises";

var SEASON = process.env.SEASON || String(new Date().getFullYear());

var DIVISIONS = [
  { key: "A", id: process.env.LEAGUE_A_ID, label: process.env.LEAGUE_A_LABEL || "Division A", color: "#C9A227" },
  { key: "B", id: process.env.LEAGUE_B_ID, label: process.env.LEAGUE_B_LABEL || "Division B", color: "#5C8A72" },
  { key: "C", id: process.env.LEAGUE_C_ID, label: process.env.LEAGUE_C_LABEL || "Division C", color: "#BC4B2C" }
].filter(function (d) { return d.id && d.id.trim().length > 0; });

var POSITION_MAP = {
  0: "QB", 1: "TQB", 2: "RB", 3: "RB/WR", 4: "WR", 5: "WR/TE", 6: "TE",
  7: "OP", 8: "DT", 9: "DE", 10: "LB", 11: "DL", 12: "CB", 13: "S",
  14: "DB", 15: "DP", 16: "D/ST", 17: "K", 18: "P", 19: "HC",
  20: "BE", 21: "IR", 23: "FLEX"
};

var PRO_TEAM_MAP = {
  0: "FA", 1: "ATL", 2: "BUF", 3: "CHI", 4: "CIN", 5: "CLE", 6: "DAL",
  7: "DEN", 8: "DET", 9: "GB", 10: "TEN", 11: "IND", 12: "KC", 13: "LV",
  14: "LAR", 15: "MIA", 16: "MIN", 17: "NE", 18: "NO", 19: "NYG",
  20: "NYJ", 21: "PHI", 22: "ARI", 23: "PIT", 24: "LAC", 25: "SF",
  26: "SEA", 27: "TB", 28: "WSH", 29: "CAR", 30: "JAX", 33: "BAL", 34: "HOU"
};

async function fetchLeague(division) {
  var apiUrl = "https://fantasy.espn.com/apis/v3/games/ffl/seasons/" + SEASON +
    "/segments/0/leagues/" + division.id + "?view=mStandings&view=mTeam&view=mRoster";
  var pageUrl = "https://fantasy.espn.com/football/league?leagueId=" + division.id;

  var browserHeaders = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.espn.com/"
  };

  // Warm-up request: some anti-bot systems require hitting the normal
  // page first to establish a session cookie before the API responds.
  var cookieJar = "";
  try {
    var warmup = await fetch(pageUrl, { headers: browserHeaders });
    var setCookie = warmup.headers.get("set-cookie");
    if (setCookie) cookieJar = setCookie;
    console.log("Warm-up request status: " + warmup.status);
  } catch (e) {
    console.log("Warm-up request failed (continuing anyway): " + e.message);
  }

  var apiHeaders = {
    "User-Agent": browserHeaders["User-Agent"],
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": pageUrl,
    "x-fantasy-source": "kona"
  };
  if (cookieJar) apiHeaders["Cookie"] = cookieJar;

  var res = await fetch(apiUrl, { headers: apiHeaders });

  var rawText = await res.text();
  console.log("--- " + division.label + " (league " + division.id + ") ---");
  console.log("HTTP status: " + res.status);
  console.log("Content-Type: " + res.headers.get("content-type"));
  console.log("Response body (first 500 chars): " + rawText.slice(0, 500));

  if (!res.ok) {
    throw new Error("League " + division.id + " (" + division.label + ") responded " + res.status);
  }
  if (!rawText || rawText.trim().length === 0) {
    throw new Error("League " + division.id + " (" + division.label + ") returned an empty response body.");
  }

  var data;
  try {
    data = JSON.parse(rawText);
  } catch (e) {
    throw new Error(
      "League " + division.id + " (" + division.label + ") did not return valid JSON. See logged response body above."
    );
  }

  var teams = (data.teams || []).map(function (t) {
    var record = (t.record && t.record.overall) || {};
    var wins = record.wins || 0;
    var losses = record.losses || 0;
    var ties = record.ties || 0;
    var games = wins + losses + ties;
    var winPct = games > 0 ? (wins + ties * 0.5) / games : 0;
    var name = (t.location && t.nickname) ? (t.location + " " + t.nickname).trim() : (t.name || ("Team " + t.id));

    var rosterEntries = (t.roster && t.roster.entries) || [];
    var roster = rosterEntries.map(function (entry) {
      var p = (entry.playerPoolEntry && entry.playerPoolEntry.player) || {};
      return {
        name: p.fullName || "Unknown",
        position: POSITION_MAP[p.defaultPositionId] || "?",
        proTeam: PRO_TEAM_MAP[p.proTeamId] != null ? PRO_TEAM_MAP[p.proTeamId] : "FA",
        slot: POSITION_MAP[entry.lineupSlotId] || "BE"
      };
    });

    return {
      id: t.id,
      name: name,
      wins: wins,
      losses: losses,
      ties: ties,
      winPct: winPct,
      pointsFor: record.pointsFor != null ? record.pointsFor : 0,
      pointsAgainst: record.pointsAgainst != null ? record.pointsAgainst : 0,
      roster: roster
    };
  });

  return { key: division.key, label: division.label, color: division.color, teams: teams };
}

async function main() {
  if (DIVISIONS.length === 0) {
    throw new Error("No league IDs configured. Set LEAGUE_A_ID / LEAGUE_B_ID / LEAGUE_C_ID.");
  }

  var results = [];
  var errors = [];

  for (var i = 0; i < DIVISIONS.length; i++) {
    var division = DIVISIONS[i];
    try {
      var result = await fetchLeague(division);
      results.push(result);
      console.log("Fetched " + division.label + ": " + result.teams.length + " teams");
    } catch (err) {
      console.error("Failed to fetch " + division.label + ": " + err.message);
      errors.push({ division: division.label, error: err.message });
    }
  }

  var output = {
    generatedAt: new Date().toISOString(),
    season: SEASON,
    divisions: results,
    errors: errors
  };

  await mkdir("docs", { recursive: true });
  await writeFile("docs/data.json", JSON.stringify(output, null, 2));
  console.log("Wrote docs/data.json");

  if (results.length === 0) {
    process.exit(1);
  }
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
