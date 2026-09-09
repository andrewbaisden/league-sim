# Architecture

## System

```text
football-data.org
        │ fetch + endpoint Zod schema
        ▼
provider adapter ── normalized LeagueSim DTOs
        │
        ▼
idempotent ingestion ── PostgreSQL/Prisma
                              │
                 ┌────────────┴────────────┐
                 ▼                         ▼
           Next.js web              immutable snapshot
                 │                         │
                 ▼                         ▼
              browser             pure simulation engine
                                           │
                              in-process or Redis/BullMQ
                                           │
                                           ▼
                                      Fly.io worker
```

The workspace isolates pure domain logic, persistence, provider translation, validation, application delivery, and background execution. The demo repository uses an in-memory season source; the Prisma schema is the production system of record.

## Canonical and simulation reality

`Country`, `Competition`, `Season`, `TeamSeason`, `Fixture`, and `MatchResult` are canonical. A simulation begins by copying confirmed results, remaining fixtures, rules, and ratings into an immutable `SimulationBaseSnapshot`. Overrides and sampled results are stored only under scenario/simulation entities. Rebase creates a new snapshot reference rather than rewriting history.

## Standings and ratings

The standings function initializes all teams, consumes confirmed results, derives table columns, and applies season-configured ranking rules. Unresolved sporting ties receive shared ranks.

`poisson-v1` / `poisson-stars-v1` calculate league-relative home/away attack and defence with five-match shrinkage. Fifteen percent recent form is blended in and capped to a ten-percent relative movement. When clubs declare FC-style star priors, clamped attack/defence multipliers are applied and the snapshot is labelled `poisson-stars-v1`. These values produce independent home and away expected-goal rates.

## Monte Carlo

The engine works entirely in memory. Per-fixture distributions are computed from immutable ratings, each run derives its own seed, and aggregated counters are persisted instead of every table. This makes output independent of worker chunk order. The initial worker concurrency is two.

## Caching and freshness

Cache keys contain the snapshot fingerprint, model version, normalized scenario, seed, and run count. Historical data may be cached indefinitely; fixture TTLs are six hours off matchdays and fifteen minutes on matchdays. Stale provider data remains visible with its last successful retrieval time.

## Deployment

The web process is stateless on Vercel. Neon owns PostgreSQL, Upstash owns Redis, and Fly.io hosts the persistent worker. Demo mode is a deliberate degraded mode and remains deployable without any external service.
