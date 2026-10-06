# Golazo

A fast, lightweight football hub for the Champions League, Europa League, Europe's Top 5 leagues,
UEFA Nations League, MLS, and the complete World Cup 2026 archive. It combines live/upcoming/recent
matches, tables, top scorers, assists, transfers, and attributed news on mobile and web.

Static-first, installable (PWA), and backed only by a thin read-only edge data layer.
No accounts, no user data, no tracking.

## 🔗 Live sites

| Environment | URL | Hosting |
| --- | --- | --- |
| **Live (production)** | https://golazo-5ce.pages.dev/ | Cloudflare (edge functions for live scores) |
| **Staging** | https://timkaboya.github.io/golazo/ | GitHub Pages (static fallback data) |

Both build from `main`. The Cloudflare **Live** site runs the `/api/*` edge functions that
normalize and briefly cache current football scores. Competition and landing-page match boards
refresh immediately and every minute while visible. GitHub Pages uses the same public,
CORS-enabled Cloudflare feed and falls back to its build-time ESPN snapshot when unavailable.

## ✨ Features

- **Full match centre** — every live, upcoming, and recent card opens a responsive game view with
  overview, provider-confirmed or expected lineups, relevant table, match stats, and head-to-head.
- **Live match boards** — scores, clocks, and live/upcoming/recent placement refresh while the page
  is open, pause in background tabs, and resume as soon as the page becomes visible.
- **Competition homes** — fixtures, standings, player statistics, news, and transfers.
- **Player leaders** — per-competition and aggregate scorer/assist boards.
- **Top news** — current attributed stories surfaced directly beside the landing match centre.
- **World Cup archive** — all 104 results, group tables, player leaders, and knockout bracket.
- **Responsive dashboard** — dense desktop information with mobile-safe horizontal navigation.
- **PWA** — installable, offline-tolerant, with a service worker.

## 🧱 Tech stack

- **[Astro](https://astro.build/)** (static output) with **[Preact](https://preactjs.com/)** islands for interactivity.
- **TypeScript** throughout.
- **Cloudflare Pages Functions** (`/functions/**`) for the read-only live-score edge APIs.
- Build-time data fetch from public **ESPN** competition feeds + RSS news (no API keys).
- **Vitest** (unit) and **Playwright** (e2e) for tests; a bundle-size budget check for perf.

## 🚀 Quick start

```bash
npm install
npm run dev        # http://localhost:4321  (uses static fallback data; no edge fn locally)
npm run build      # outputs dist/
npm run preview    # serve the production build
npx wrangler pages dev dist  # production-like local preview with /api match detail
```

Common scripts:

| Script | What it does |
| --- | --- |
| `npm run typecheck` | Type-check with `tsc --noEmit` |
| `npm run test:coverage` | Unit tests with enforced Vitest coverage thresholds |
| `npm run e2e` | End-to-end tests (Playwright) |
| `npm run perf` | Enforce the client-JS bundle-size budget (90 KB gzip) |
| `npm run data:football` | Refresh all league, cup, news, table, and player-stat snapshots |
| `npm run data` / `npm run data:news` | Refresh the World Cup archive score/news snapshots |

## 📚 Docs

- [Product Spec](./docs/PRODUCT_SPEC.md) — what the product does, user stories, requirements.
- [Technical Spec](./docs/TECHNICAL_SPEC.md) — architecture and how the pieces interact.
- [Deployment](./docs/DEPLOYMENT.md) — hosting on Cloudflare and static fallbacks.
- [Contributing](./CONTRIBUTING.md) — how to propose changes, and the CI guard rails.

## 🤝 Contributing

Contributions are welcome! Please read **[CONTRIBUTING.md](./CONTRIBUTING.md)** first — it covers
the branch/PR workflow and the checks every change must pass (typecheck, tests, build, e2e, and the
bundle-size budget). All pull requests run these automatically via GitHub Actions.

## ☕ Support

A site-wide footer **"Buy me a coffee"** button lets fans chip in via [Paystack](https://paystack.com/)
(cards, bank & mobile money). It's optional and fully self-hosted — no third-party JS loads until a
visitor actually opens the donation modal.

Configure it with environment variables (see [`.env.example`](./.env.example)):

| Variable | Where | Notes |
| --- | --- | --- |
| `PUBLIC_PAYSTACK_KEY` | build-time (public) | `pk_test_…` / `pk_live_…`. If unset, the button is hidden. |
| `PUBLIC_PAYSTACK_CURRENCY` | build-time (public) | e.g. `NGN`, `KES`, `GHS`, `ZAR`, `USD`. |
| `PAYSTACK_SECRET_KEY` | Cloudflare env **secret** | Powers `/api/verify-payment`; **never committed**. Set with `npx wrangler pages secret put PAYSTACK_SECRET_KEY`. |

On Cloudflare, payments are verified server-side before showing a confirmation. On GitHub Pages
(no edge functions), the app identifies the payment as accepted by Paystack but not server-verified
on that host. A failed Cloudflare verification is never presented as a confirmed payment.

## 🧭 Principles

Lightweight first · No accounts · Your timezone · Mobile + web · Authentic, attributed content.

## 📄 License

Released under the [MIT License](./LICENSE).

> Score, fixture, statistic, and news data are sourced from public third-party feeds and belong to
> their respective owners. This project is an unofficial fan companion.
