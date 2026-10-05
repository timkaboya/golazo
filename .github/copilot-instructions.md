# Copilot repository instructions

Follow `AGENTS.md` and `CONTRIBUTING.md` for every change.

- Treat tests as part of implementation, not follow-up work.
- Add focused unit tests for every new or changed pure function, including meaningful error and
  boundary cases.
- Add regression tests for bug fixes and Playwright coverage for user-visible workflows.
- Do not declare work complete until affected tests and `npm run test:coverage` pass.
- Never weaken or bypass coverage thresholds to make a change pass.
