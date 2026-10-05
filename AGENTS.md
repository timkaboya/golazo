# Repository instructions

These rules apply to every human or coding agent changing this repository.

## Required validation

- Design behavioral changes for deterministic testing.
- Add or update a focused unit test for every new or changed pure function.
- Test normal behavior, meaningful boundaries, and failure or invalid-input behavior.
- Add a regression test for every bug fix.
- Use integration tests for data adapters and generated snapshots.
- Use Playwright for user-visible navigation, responsive behavior, and critical workflows. E2E
  tests supplement rather than replace unit tests.
- Mock external services in tests; do not make unit tests depend on live feeds.
- Run `npm run typecheck`, `npm run test:coverage`, `npm run build`, `npm run perf`, and relevant
  Playwright tests before declaring work complete.
- Do not lower coverage thresholds to make a change pass. Add tests or document and justify a
  legitimate coverage-scope change.

## Architecture constraints

- Keep the site static-first and preserve the 90 KB gzip client-JavaScript budget.
- Extract calculations, mapping, filtering, and state transitions from UI/network code when needed
  to test them directly.
- Preserve World Cup archive behavior while extending shared football features.
- Never add tracking, accounts, personal-data collection, or secrets.
