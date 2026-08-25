# Cornerstone Men's League — Combined Standings Site

A self-updating site that pulls standings + rosters from three public ESPN
fantasy football leagues and displays them as one combined board. A
GitHub Action scrapes ESPN's data server-side (avoiding the browser CORS
block) every 6 hours and commits the result; GitHub Pages serves the site
for free.

## One-time setup (about 10 minutes)

1. **Create a GitHub repo.** Go to github.com, click "New repository,"
   name it something like `mens-league-standings`, keep it public,
   create it.

2. **Upload these files.** On the repo page, click "Add file" →
   "Upload files," drag in everything from this folder (keep the folder
   structure: `.github/workflows/update-standings.yml`, `docs/index.html`,
   `docs/data.json`, `scrape.js`, `package.json`). Commit.

3. **Set your league IDs as repo variables** (not secrets — league IDs
   aren't sensitive, and this makes them easy to change later without
   touching code):
   - Go to Settings → Secrets and variables → Actions → Variables tab
   - Add: `SEASON` (e.g. `2026`), `LEAGUE_A_ID`, `LEAGUE_B_ID`,
     `LEAGUE_C_ID` (the number from each league's ESPN URL), and
     optionally `LEAGUE_A_LABEL` / `LEAGUE_B_LABEL` / `LEAGUE_C_LABEL`
     for display names.

4. **Turn on GitHub Pages:**
   - Settings → Pages → under "Build and deployment," set Source to
     "Deploy from a branch," branch `main`, folder `/docs`. Save.
   - GitHub will give you a URL like
     `https://yourname.github.io/mens-league-standings/` — that's the
     link you share with the group.

5. **Run the scraper once manually:**
   - Go to the Actions tab → "Update fantasy standings" workflow →
     "Run workflow" → Run. This does the first scrape immediately
     instead of waiting up to 6 hours.
   - Refresh the site — standings and rosters should appear.

After that, it updates itself automatically every 6 hours. You can
always trigger an immediate refresh from the Actions tab (handy right
before or after a Sunday slate).

## Requirements

- All three ESPN leagues must be set to **public** in league settings
  (this was already required for the earlier approach — same
  requirement here, it just now works reliably).

## Adjusting the refresh schedule

Edit the `cron` line in `.github/workflows/update-standings.yml`.
It's in UTC. `0 */6 * * *` = every 6 hours. `0 * * * *` = hourly if
you want tighter updates during game days.

## If a division shows an error

The site will still load the divisions that worked and show which
one(s) failed at the top of the board — usually means that league's
ID is wrong or it got switched back to private.
