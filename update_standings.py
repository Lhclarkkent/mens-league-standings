import csv
import os
from espn_api.football import League

# Securely pull your ESPN cookies from GitHub Secrets
swid = os.environ.get('SWID')
espn_s2 = os.environ.get('ESPN_S2')

# Define your 3 leagues - Replace these IDs with your actual ESPN League IDs!
league_ids = [
    {"id": 765952010, "division": "Patriarchs"},
    {"id": 2222222, "division": "Division 2"},
    {"id": 3333333, "division": "Division 3"}
]

all_teams = []

# Loop through each league, pull the standings, and format the data
for l in league_ids:
    league = League(league_id=l["id"], year=2026, espn_s2=espn_s2, swid=swid)
    
    for team in league.teams:
        all_teams.append([
            l["division"], 
            team.team_name, 
            team.wins, 
            team.losses, 
            team.ties, 
            round(team.points_for, 1), 
            round(team.points_against, 1)
        ])

# Overwrite standings.csv with the fresh data
with open("standings.csv", "w", newline="") as file:
    writer = csv.writer(file)
    writer.writerow(["Division", "Team", "Wins", "Losses", "Ties", "Points For", "Points Against"])
    writer.writerows(all_teams)

print("Standings successfully updated!")
