# nfl-opening-day-countdown

A live countdown to NFL kickoff, with a team filter and a full schedule for every team.

## Features

- **Countdown clock** to the league's opening kickoff, or to a selected team's next game.
- **Team filter** — search by name/city, or filter by conference (AFC/NFC) and division.
- **Per-team schedule** — every game for the season, with date/time (in your local timezone), opponent, home/away, venue, TV network, bye week, and final scores for completed games.
- **Official team site links** on every team card and schedule page.

## Data

Schedule, score, and logo data is fetched live in the browser from ESPN's public NFL API — nothing is hardcoded or bundled, so it stays accurate as the season progresses. No API key, backend, or build step required.

## Running it

It's a static site — just open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Project structure

```
index.html        Page structure
css/styles.css     Styling (dark theme, team-color accents)
js/teams.js        Static team reference data (IDs, colors, official site links)
js/app.js          Countdown, filtering, and schedule rendering logic
```
