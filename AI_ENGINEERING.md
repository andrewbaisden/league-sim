# AI-Assisted Engineering

LeagueSim is a statistical simulation platform engineered with an AI-assisted workflow. It is not an AI football predictor.

## Human responsibilities

- Product direction and scope approval
- Football-data provider and licensing approval
- Statistical methodology review
- UX review and accessibility acceptance
- Security review, secrets, production accounts, and deployment authorization
- Validation of assumptions and final code review

## AI-assisted responsibilities

- Architecture and domain proposals
- Pure engine, provider adapter, persistence, UI, worker, and test implementation
- Mathematical invariant and deterministic regression tests
- Documentation, refactoring, debugging, and profiling support

## Review record

The initial brief established correctness, transparency, real/simulated separation, one-league focus, and reproducibility as priorities. The implementation consequently begins with a pure domain package and deterministic demo season. Model changes require updated tests and an architecture decision so generated code cannot silently change the meaning of a probability.
