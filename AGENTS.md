# LeagueSim Agent Guide

## Non-negotiable boundaries

- Keep TypeScript strict. Do not introduce `any` or weaken compiler checks.
- `packages/domain` must stay independent of React, Next.js, Prisma, HTTP, Redis, and provider payloads.
- Never alter simulation mathematics without updating tests and documenting the decision in `DECISIONS.md`.
- Never couple domain logic directly to an external football provider response.
- Canonical `Fixture`/`MatchResult` records must never be mutated by simulations.
- Randomness in domain code must come from `RandomSource`; never call `Math.random()` there.
- Every stored simulation must identify its base snapshot, seed, model version, and normalized inputs.

## Changes

- Use Zod at HTTP, provider, environment, and persisted-JSON boundaries.
- Add Prisma migrations for schema changes; never use production `db push`.
- Preserve server/client boundaries: server components load initial data, TanStack Query manages client-visible remote state, and Zustand holds only unsaved local controls.
- Keep database access outside simulation loops.
- Add indexes or explain why none are needed for new high-volume query paths.
- Treat provider jobs as idempotent and retryable. Never wrap network calls in database transactions.
- Keep real, demo, and simulated states visibly labelled in UI and API responses.

## Verification

- Run Biome, typechecking, unit tests, and a production build before handoff.
- Use deterministic golden fixtures for mathematical regressions.
- Test probability normalization, standings invariants, seed reproducibility, and numerical boundaries.
- Add component tests for user-visible error, loading, empty, and accessibility states.
- Use Conventional Commits with small logical changes.
