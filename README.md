# LeagueSim

[![Build](https://github.com/andrewbaisden/league-sim/actions/workflows/ci.yml/badge.svg)](https://github.com/andrewbaisden/league-sim/actions/workflows/ci.yml)
[![Release](https://img.shields.io/badge/release-v0.1.0-2f6f4e)](https://github.com/andrewbaisden/league-sim/blob/main/package.json)
[![License](https://img.shields.io/badge/license-all%20rights%20reserved-5c6b5a)](#license)

LeagueSim is a Premier League workspace for the season in front of you. It shows the table as it stands, the fixtures still to play, and how the league might finish if you simulate the run-in.

Start from a clearly labelled demo season, lock a result, adjust a side’s attack, or run the rest of the campaign. Confirmed results stay separate from hypothetical ones.

![LeagueSim season workspace, with the Premier League table and the simulation lab](docs/leaguesim.png)

## What you can do

- Read the league table, recent form, and each club’s remaining fixtures.
- Open a team page for ratings, schedule, and projected points from a saved simulation.
- Step through the season matchweek by matchweek and return to the same run.
- Simulate a single match or the rest of the season from a fixed seed.
- See title, top-four, top-six, and relegation chances, plus likely points and finishing places.
- Try a what-if: force a winner, a draw, or an exact score, or nudge either side’s attack.
- Open the match centre for a fixture, including a synthetic view of how that game might look.
- Sign in, name a scenario, and reopen it later from your account.

The demo season is the 2026/27 Premier League, starting before matchweek 1. Every club begins level. Strength still differs because each side carries a star rating that feeds the model.

## Getting started

You can browse and simulate immediately. Docker and a database are only needed if you want runs saved between visits.

```bash
git clone git@github.com:andrewbaisden/league-sim.git
cd league-sim
corepack enable
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Installation

- [Node.js](https://nodejs.org/) 22 or newer
- [pnpm](https://pnpm.io/) 11, enabled with Corepack (`corepack enable`)
- [Docker](https://www.docker.com/), optional, for PostgreSQL and Redis

## Setup

Copy the example environment, then start the local database if you want persistence.

```bash
cp .env.example .env
cp .env.example apps/web/.env.local
docker compose up -d
pnpm db:setup
pnpm dev
```

`DATABASE_URL` belongs in both `.env` and `apps/web/.env.local`. Postgres is published on port **5433**.

Live football-data.org ingestion is off unless you set `FOOTBALL_DATA_API_TOKEN` and `FOOTBALL_DATA_MODE=provider`. The demo keeps working if that token is empty.

Saved scenarios, account sign-in, worker batches, and deployment targets are described in the [specification](./SPECIFICATION.md).

## Documentation

| Document | What it covers |
| --- | --- |
| [Specification](./SPECIFICATION.md) | Product boundary, stack, local operation, quality checks, and deployment |
| [Architecture](./ARCHITECTURE.md) | How confirmed data, snapshots, and simulations stay apart |
| [Decisions](./DECISIONS.md) | Model choices, including Poisson ratings and what they do not claim |
| [Testing](./TESTING.md) | Unit, contract, integration, and end-to-end checks |
| [AI-assisted engineering](./AI_ENGINEERING.md) | What stays a human decision when code is written with AI help |

## Responsible use

LeagueSim explores uncertainty. A simulation is a statistical hypothetical, not a prediction you should treat as certain, and not betting advice.

Demo scores and match-centre figures are synthetic. When a page uses a football data provider, it says so and shows when that data was retrieved. Club crests and marks are not included.

Official results and simulated results are labelled differently. A what-if never overwrites the league as it actually stands.

## License

Copyright © 2026. All rights reserved.

This repository does not currently include an open-source license. You may read the code. Copying, modification, and redistribution need a `LICENSE` file that grants those rights.
