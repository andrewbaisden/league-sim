# Architecture Decisions

## ADR-001 — Separate canonical and simulation state

Accepted. Official results live only in canonical tables. Simulations consume immutable copies and write to simulation-owned records. This prevents a hypothetical score from becoming an apparent fact.

## ADR-002 — Provider abstraction and football-data.org

Accepted. MVP provider payloads are validated and normalized behind a LeagueSim-owned contract. football-data.org is selected for free-first Premier League coverage. Provider IDs are mapping data, not domain identity. Provider attribution is visible and club graphics remain disabled pending rights review.

## ADR-003 — Internal standings

Accepted. Provider standings are reconciliation input only. LeagueSim must calculate real and projected tables with the same pure function.

## ADR-004 — Poisson v1

Accepted. Independent Poisson distributions provide a transparent first model. League averages use a 20-match prior, team rates use five equivalent prior matches, recent-form rates use a three-match prior, and form contributes 15% with a ±10% cap. Expected goals are clamped to 0.05–5.00. Dixon–Coles is deferred until backtesting shows a material calibration gain.

## ADR-005 — Fixed ratings within a run

Accepted. Ratings are frozen at the base snapshot. Simulated results do not recursively alter later fixture probabilities. Dynamic ratings require a new model version.

## ADR-006 — Seeded randomness and versioning

Accepted. Domain randomness uses a deterministic 32-bit generator; run streams derive from batch seed and run index. Every result records `poisson-v1` and its seed.

## ADR-007 — Unresolved ties

Accepted. A playoff-required tie receives a shared rank. Monte Carlo position credit is divided uniformly across occupied positions, avoiding alphabetical bias.

## ADR-008 — In-process before worker

Accepted. Small batches run with the request. A stable batch resource allows 10,000-run or p95-over-two-second work to move to BullMQ without an API break.

## ADR-009 — Deployment

Accepted. Vercel hosts Next.js, Neon hosts PostgreSQL, Upstash hosts Redis, and Fly.io hosts the BullMQ worker.

## ADR-010 — Demo season starting state

Accepted. The deterministic demo snapshot begins before matchweek 1 with every fixture scheduled and every team level on zero statistics. The initial table uses full club names in alphabetical order but remains visually unranked; sporting ranks and competition-zone styling appear only after simulated or confirmed results exist.
