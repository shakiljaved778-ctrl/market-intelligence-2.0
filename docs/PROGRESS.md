# Prompt Pack — Progress

Tracks the 12-phase Mizaan hardening pack. One phase per branch; commit each
separately. To resume in a fresh session: _"Continue from docs/PROGRESS.md"_.

**Golden rule (see CLAUDE.md → "Non-negotiable rules for every task"):** no visual
design change. Run `pnpm visual:compare` before finishing any phase; revert any
unapproved diff above 0.5% (outside masked live data).

## Inputs still needed (blank = step skipped & listed in final report)

- Editor bio (2–3 lines), Editor LinkedIn URL
- Contact/form email, public editorial email (`editor@mizaan.tech`?)
- GA4 ID, Clarity ID, Search Console code
- Social URLs for `sameAs` (LinkedIn, X, WhatsApp channel)
- Newsletter: name "Mizaan Morning", from `briefing@mizaan.tech`
- Resend domain verification; data-provider commercial-rights check (Phase 9/10)

## Phase status

| # | Phase | Status | Branch | Notes |
|---|---|---|---|---|
| 0 | Guardrails, audit, baseline | ✅ done | `claude/wonderful-davinci-3fxwpg` | Rules in CLAUDE.md; docs/AUDIT.md; visual baseline (36 shots) + `visual:compare` gate |
| 1 | Market data integrity | ✅ done | `claude/wonderful-davinci-3fxwpg` | Sanity layer + tests; GCC spotlight hidden (no real source); recap ≥80% gate; peg already centralised |
| 2 | News feed quality | ⏳ pending | | Dedupe/quality-gate/classifier machinery; needs real feeds for live effect |
| 3 | Technical SEO | ⏳ pending | | Per-route metadata, split sitemaps, news-sitemap, RSS/section, per-slug OG |
| 4 | Google News / E-E-A-T | ⏳ pending | | Author entity, trust pages, bylines, corrections log |
| 5 | Programmatic GCC stock pages | ⏳ pending | | Needs a GCC EOD data source (none configured yet) |
| 6 | Newsletter + daily briefing | ⏳ pending | | Resend; env RESEND_* |
| 7 | Analytics | ⏳ pending | | GA4/Vercel/Clarity/GSC + consent notice |
| 8 | Performance (pixel-identical) | ⏳ pending | | Lighthouse before/after |
| 9 | Security & licences | ⏳ pending | | Rate limits, headers, .env.example, licence audit |
| 10 | Monetisation readiness | ⏳ pending | | Sponsor slot, /advertise, /for-business — all disabled |
| 11 | Final QA | ⏳ pending | | Full `visual:compare` + production SEO verification |

## Phase 0 — what was built (this branch)

- **CLAUDE.md**: appended the "Non-negotiable rules for every task" section so every
  later session inherits the no-visual-change guardrails.
- **docs/AUDIT.md**: full stack/data/SEO/analytics/security audit + 10-bullet summary
  and a cross-cutting note that Phases 1/2/5 presuppose live keys + populated Postgres.
- **Visual baseline** (deviation from the pack's `scripts/visual-baseline.ts`): used
  Playwright's native snapshot diffing instead of a hand-rolled pixelmatch script — no
  new dependency, robust masking, same 0.5% threshold.
  - `playwright.visual.config.ts` — mobile (390) + desktop (1440) projects, 0.5%
    `maxDiffPixelRatio`, animations disabled, 30s assertion timeout.
  - `tests/visual/visual.spec.ts` — 9 routes × 2 themes × 2 viewports = **36 shots**,
    masking `.ticker-tape` and all `.tnum` figures (so live/fixture numbers never
    trip the diff). Article slug discovered from the wire (deterministic in fixture mode).
  - `tests/visual-baseline/{mobile,desktop}/*.png` — committed baselines.
  - npm scripts: `visual:baseline` (record), `visual:compare` (verify).
- Verified: `pnpm visual:compare` → **36 passed**; `tsc`, `eslint`, `prettier` clean.

## Phase 1 — what was built (market data integrity)

- **`lib/market/sanity.ts`** + **`sanity.test.ts`** (7 tests): the single server-side
  validator — rejects null/zero/negative prices, rejects stale quotes (delay + 24h
  grace), flags outliers (>15% stock / >5% index) and requires a second source within
  1% else falls back to the last-valid value (keeping its timestamp). Logs every
  rejection.
- **`lib/market/read.ts`**: every live quote now passes through `sanitizeQuote()` at the
  single `liveQuote()` chokepoint (used by `readQuote` + `readUniverse` = all widgets),
  so a bad live value is dropped and the widget falls back to a clearly-labelled sample.
  (Outlier second-source confirmation belongs in the ingest job — it has a 2nd provider
  and the prior value; wire it there in a later pass.)
- **`lib/market/indices.ts`** + **`app/page.tsx`**: GCC spotlight now reads **real** GCC
  EOD levels from cache (`market:index:<symbol>`); with no such source configured it
  returns `[]`, so the spotlight **hides** (logs a warning) instead of showing
  illustrative values. **This is the one intended visual change in Phase 1** — the
  homepage baseline was re-recorded. The block reappears automatically once a real GCC
  EOD provider writes those keys.
- **`lib/narrative/read.ts`**: session recap is only built when ≥80% of tracked indices
  have a valid close (fixture mode is 100% valid, so the demo is unchanged).
- **QAR peg**: already a single constant (`lib/currency/peg.ts`) imported everywhere —
  no change needed.
- Verified: `tsc`, `eslint`, `prettier`, `check:colors` clean; **98 unit tests pass**;
  `pnpm visual:compare` → **36 passed** (only the home shots changed, as intended).

### Deferred from Phase 1 (reported, not silently skipped)
- **Wholesale fixture removal** was NOT done: with zero live keys it would blank the
  production site (violates the zero-key invariant). Fixtures stay as the *labelled*
  fallback; the sanity layer + GCC-hide give the "real-or-hidden" behaviour where it
  matters. Flip fully to real data by adding the keys in `DEPLOY.md`.
- **Outlier second-source confirmation** at ingest time (needs a 2nd provider call in
  the quotes job) — validator is built & tested, wiring deferred.

### Decisions & open items
- **Branch strategy: decided** — all phases commit to the single branch
  `claude/wonderful-davinci-3fxwpg` (owner chose one rolling branch over `fix/NN-*`).
- **Live-data sequencing (open)**: Phases 1, 2 and 5 can only show *real* numbers once
  Finnhub/FRED/KV/Postgres keys exist (DEPLOY.md). Until then they build the
  validation/dedup/hide-when-empty machinery, not live values.
