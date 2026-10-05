# Contributing

Thanks for your interest in improving **Mitty's Football**! This static-first football hub covers
major leagues and competitions while preserving the World Cup 2026 archive. These guidelines keep
changes reliable, accessible, and fast.

## Ground rules

- **Be respectful.** Assume good intent and keep discussion constructive.
- **Keep it lightweight.** This app has a strict client-JS budget (**90 KB gzip**). Avoid new
  runtime dependencies unless there's no reasonable alternative.
- **No accounts, no tracking, no user data.** Do not add analytics, sign-in, or anything that
  collects personal data.
- **Static-first.** Prefer build-time data and static rendering. Client interactivity is done with
  small Preact islands, not a heavy SPA framework.
- **Respect data sources.** Score/news data comes from public third-party feeds. Keep attribution
  intact and don't hard-code copyrighted content.
- **Never commit secrets.** No API keys, tokens, or credentials. The app intentionally needs none.

## Workflow

1. **Fork** the repo (or create a branch if you have write access).
2. **Branch from `main`.** Use a descriptive name, e.g. `fix/bracket-overlap` or
   `feat/match-lineups`.
3. **Make focused changes.** One logical change per pull request; keep diffs surgical.
4. **Run the checks locally** (see below) before opening a PR.
5. **Open a pull request** against `main` and fill in the PR template.
6. A maintainer reviews and merges once CI is green.

`main` is the deploy branch — every merge ships to both the Cloudflare **Live** site and the
GitHub Pages **Staging** site. Do not push directly to `main`; use a pull request.

## Required checks (guard rails)

Every pull request **must pass all of the following** before it can be merged. They run
automatically in GitHub Actions (`.github/workflows/ci.yml`), and you can run them locally:

```bash
npm run typecheck   # TypeScript: no type errors
npm run test:coverage # Vitest unit tests and enforced coverage thresholds
npm run build       # Astro production build succeeds
npm run perf        # Client JS stays within the 90 KB gzip budget
npm run e2e         # Playwright end-to-end tests
```

A PR is expected to:

- [ ] Pass typecheck, unit tests with coverage, build, e2e, and the bundle-size budget.
- [ ] Add or update focused tests for every changed behavior and testable function.
- [ ] Keep the change small and focused (no unrelated refactors).
- [ ] Update docs (`README.md` / `docs/**`) when behavior or setup changes.
- [ ] Not add new tracking, accounts, secrets, or heavyweight dependencies.

## Testing and coverage policy

Every behavioral change must be designed so its outcomes can be tested deterministically.
Contributors and coding agents follow the same rules:

- Add or update a focused unit test for each new or changed pure function. Cover the normal case,
  failure or invalid-input behavior, and meaningful boundaries.
- Extract data mapping, filtering, calculations, and state transitions from UI or network code when
  that makes them independently testable. Do not export implementation details solely to inflate
  coverage.
- Use integration tests for module boundaries, generated snapshots, and external-data adapters.
  Mock network responses; unit tests must not depend on live third-party services.
- Add or update Playwright tests for user-visible navigation, responsive behavior, and critical
  workflows. E2E coverage supplements unit tests and never replaces them.
- Bug fixes must include a regression test that fails without the fix.
- A change is not complete until its affected tests pass and `npm run test:coverage` meets the
  thresholds in `vitest.config.ts`. Never lower thresholds to make a change pass; add tests or
  explicitly justify a scope change in review.

Coverage intentionally measures testable core logic under `src/lib`. Astro templates, generated
data, browser/runtime adapters, and environment-specific entry points are validated through
typecheck, build, integration, and E2E checks instead of misleading line-coverage numbers.

## Coding conventions

- **TypeScript everywhere**; no `any` unless unavoidable and justified.
- **Preact islands** for interactivity — keep them small and hydrate only what's needed.
- **Comment sparingly** — only where intent isn't obvious from the code.
- Match the existing style (design tokens live in `src/styles/tokens.css`).
- When touching cached assets, bump the service-worker version in `public/sw.js`.

## Reporting bugs / requesting features

Open an issue describing the problem or idea. For bugs, include steps to reproduce, what you
expected, and what happened (screenshots welcome). For data issues (wrong score, missing match),
note the match and the source shown.

## License

By contributing, you agree that your contributions are licensed under the project's
[MIT License](./LICENSE).
