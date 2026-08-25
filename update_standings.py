import csv
import os
from espn_api.football import League

# Pull cookies securely from GitHub Secrets
swid = os.environ.get('SWID')
espn_s2 = os.environ.get('ESPN_S2')

# The 3 ESPN League IDs
league_ids = [
    {"id": 1111111, "division": "Division 1"},
    {"id": 2222222, "division": "Division 2"},
    {"id": 3333333, "division": "Division 3"}
]

all_teams = []

for l in league_ids:
    league = League(league_id=l["id"], year=2026, espn_s2=espn_s2, swid=swid)
    for team in league.teams:
        all_teams.append([
            l["division"], team.team_name, team.wins, team.losses, team.ties, team.points_for, team.points_against
        ])

with open("standings.csv", "w", newline="") as file:
    writer = csv.writer(file)
    writer.writerow(["Division", "Team", "Wins", "Losses", "Ties", "Points For", "Points Against"])
    writer.writerows(all_teams)

print("Standings successfully updated!")