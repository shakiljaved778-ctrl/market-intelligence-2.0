# Performance — baseline (before Phase 8)

> **Measurement note.** This sandbox blocks the CDNs Lighthouse pulls, so the numeric
> run must be captured in CI or against the Vercel deploy:
> `npx lighthouse https://www.mizaan.tech/ --preset=perf --form-factor=mobile --quiet`
> for `/`, `/markets`, `/news`, one `/news/<slug>`, one `/quote/<symbol>`. Record the
> numbers in the table below, then re-run after the Phase 8 changes (PERF-AFTER.md).

## Already-strong posture (pre-Phase 8)

- **Fonts**: `next/font` self-hosted, `display: swap`, only the weights in use — no FOIT,
  no external font request.
- **Images**: **no raw `<img>`** anywhere. Cover art is a deterministic on-brand **SVG**
  (`components/news/CoverArt.tsx`) rendered with no network request; the only remote
  reference is an optional Pexels `og:image`.
- **Data**: pages read from **KV cache → Postgres → fixture** (`lib/market/read.ts`,
  `lib/news/read.ts`) and **never call a vendor on render** — no slow third-party calls
  in the request path. React `cache()` dedupes the wire load per request.
- **Rendering**: Server Components by default; client components (`'use client'`) only for
  interactivity (toggles, chart, command palette). No client-side data fetch for first paint.
- **Chrome**: `poweredByHeader: false`; security headers added in Phase 9.

## Targets (§8)

| Metric | Target |
|---|---|
| Lighthouse Performance (mobile) | ≥ 90 |
| LCP | < 2.5s |
| CLS | < 0.1 |
| INP | < 200ms |

## Baseline numbers — fill from CI

| Route | Perf | LCP | CLS | INP |
|---|---|---|---|---|
| `/` | [CHECK] | | | |
| `/markets` | [CHECK] | | | |
| `/news` | [CHECK] | | | |
| article | [CHECK] | | | |
| quote | [CHECK] | | | |
