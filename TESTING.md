# Testing

## Layers

- Domain unit tests cover standings, ratings, Poisson probabilities, seeded sampling, scenarios, and Monte Carlo aggregation.
- Provider contract tests use captured fixtures and never call a live API in CI.
- Repository integration tests run against disposable PostgreSQL and Redis services.
- React Testing Library checks semantic UI behavior.
- Playwright covers public and authenticated journeys in deterministic demo mode.

## Probabilistic code

Never write a test whose success depends on fresh uncontrolled randomness. Exact regressions use fixed seeds. Statistical tests use a fixed sample and a tolerance chosen before inspecting the result. Core invariants include probability mass summing to one, non-negative integer goals, `P = W + D + L`, and `GD = GF - GA`.

## Commands

```bash
pnpm test
pnpm --filter @leaguesim/domain test:watch
pnpm test:e2e
```

CI treats domain, type, formatting, and build failures as deployment blockers.
