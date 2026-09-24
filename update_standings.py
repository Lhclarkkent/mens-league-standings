import csv
import os
from espn_api.football import League

# Optional ESPN cookies for private leagues (kept for backwards compatibility
# with the GitHub Actions workflow secrets). All three leagues below are
# public, so these are not required.
swid = os.environ.get('SWID')
espn_s2 = os.environ.get('ESPN_S2')

# The three public ESPN leagues that make up the 36-team super league.
league_ids = [
    {"id": 765952010, "division": "Faith Fighters"},
    {"id": 115119444, "division": "Apostles"},
    {"id": 929898854, "division": "Patriarchs"},
]

all_teams = []


def clean(s):
    """Normalize ESPN team/owner names: trim whitespace, straighten quotes."""
    return (s or "").strip().replace("\u2019", "'").replace("\u2018", "'")


for l in league_ids:
    league = League(league_id=l["id"], year=2026, espn_s2=espn_s2, swid=swid)

    for team in league.teams:
        owners = []
        for o in team.owners or []:
            name = clean(f"{o.get('firstName', '')} {o.get('lastName', '')}").replace("  ", " ")
            if name:
                owners.append(name)
        owner = " & ".join(owners)
        all_teams.append([
            clean(team.team_name),
            owner,
            l["division"],
            team.wins,
            team.losses,
            team.ties,
            round(team.points_for, 1),
            round(team.points_against, 1),
        ])

# Column order must match what index.html's JS expects.
with open("standings.csv", "w", newline="") as file:
    writer = csv.writer(file)
    writer.writerow(["Team", "Owner", "Division", "Wins", "Losses", "Ties", "Points For", "Points Against"])
    writer.writerows(all_teams)

print(f"Standings updated: {len(all_teams)} teams across {len(league_ids)} leagues.")
