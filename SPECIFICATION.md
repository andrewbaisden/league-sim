# LeagueSim specification

This document is the project specification. The public overview, setup guide, and responsible-use notice live in [README.md](./README.md). System shape is in [ARCHITECTURE.md](./ARCHITECTURE.md). Accepted model choices are in [DECISIONS.md](./DECISIONS.md).

## Product boundary

LeagueSim separates confirmed football data from hypothetical outcomes. Standings are calculated inside the application. Matches are sampled from an explainable Poisson model. Thousands of possible seasons are aggregated into title, European-place, relegation, points, and position distributions.

Canonical `Fixture` and `MatchResult` records are never mutated by a simulation. Every stored simulation identifies its base snapshot, seed, model version, and normalized inputs. Real, demo, and simulated states stay visibly labelled in the interface and in API responses.

The repository ships with a deterministic, clearly labelled 20-team Premier League demo snapshot that begins before matchweek 1. A football-data.org v4 adapter and a production PostgreSQL/Redis schema are included. External credentials are optional for local development.

## Capabilities

- Responsive Premier League table with form and season-aware team pages
- Complete deterministic demo schedule beginning before matchweek 1
- Explainable home and away attack and defence ratings, including optional club star priors
- Seeded single-match and full-season simulation
- Monte Carlo title, top-four, top-six, relegation, points, and position distributions
- Exact-score and conditional-outcome what-if primitives
- Synthetic match centre for a selected fixture
- Provider abstraction with runtime Zod validation
- Pure simulation package reusable from Next.js, tests, the CLI, or a BullMQ worker
- PostgreSQL/Prisma persistence and Docker services
- Named scenarios saved to an account and reopened later

## Stack

Next.js 16, React 19, TypeScript, Tailwind CSS, TanStack Query, Zustand, Zod, PostgreSQL, Prisma, Redis, BullMQ, Vitest, Testing Library, Playwright, and Biome.

Node.js 22 or newer. Package manager: pnpm 11.5.3 via Corepack.

## Local operation

```bash
corepack enable
pnpm install
cp .env.example .env
cp .env.example apps/web/.env.local
docker compose up -d
pnpm db:setup
pnpm dev
```

Open `http://localhost:3000`.

- `DATABASE_URL` must be present in both `.env` (Prisma CLI) and `apps/web/.env.local` (Next.js).
- Docker Postgres uses host port **5433** so it does not clash with a local Postgres on 5432.
- Browsing and simulation work without Docker, using in-memory demo data.
- With Postgres running and `pnpm db:setup`, season simulations and Monte Carlo batches are persisted. Sign in to save named scenarios and reopen them from Account. Team pages accept `?batchId=` to show projected points, form, and results.
- The header shows **Signed in · your name** when authentication succeeds.

To use provider ingestion, register one football-data.org application, set `FOOTBALL_DATA_API_TOKEN`, and set `FOOTBALL_DATA_MODE=provider`. Ingestion persistence stays separate from application startup so a missing provider cannot corrupt or block demo operation.

## Quality

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

`pnpm check` runs Biome, typechecking, and unit tests. See [TESTING.md](./TESTING.md).

## Deployment

- Web: Vercel
- PostgreSQL: Neon
- Redis: Upstash Redis, using its TLS Redis URL
- Worker: Fly.io, using `fly.worker.toml`

Only 10,000-run or measured-slow batches should move to the worker. Small simulations stay in-process until profiling supports moving them.

## Data and model

Simulated demo scores are synthetic. Provider-backed pages must display `Data provided by football-data.org` and a retrieval timestamp. Club marks are omitted because API access does not grant trademark rights.

The initial model uses independent Poisson goal distributions. Ratings are smoothed toward a league prior, recent form has a deliberately small capped influence, and ratings stay fixed throughout a simulated season. When clubs declare star priors, the snapshot is labelled `poisson-stars-v1`. See [DECISIONS.md](./DECISIONS.md) for the exact choices and limitations.

Simulations are statistical hypothetical scenarios. They are not guaranteed forecasts and they are not betting advice.
