# Mizaan — Stack & Readiness Audit (Phase 0)

_Generated 2026-11-01. Baseline for the Claude Code Prompt Pack. No feature code
was changed to produce this document — it is a map of the system as it stands._

## 1. Framework, tooling, hosting

| Item | Value |
|---|---|
| Framework | **Next.js 15 (App Router)**, React 19 |
| Language | TypeScript 5, `strict: true` (+ `noUncheckedIndexedAccess`) |
| Styling | Tailwind v4 (`@theme inline`) + CSS custom properties; `next/font` |
| Package manager | **pnpm** (`pnpm-lock.yaml`) |
| Hosting | **Vercel** (`vercel.json`), single Next.js app (not a monorepo) |
| DB / cache | Vercel Postgres (Neon) via **Drizzle** (`lib/db/`), Vercel KV / Upstash Redis (`lib/cache/store.ts`) |
| Tests | Vitest (unit) + Playwright (`@playwright/test`, `test:e2e`) |
| Scripts | `dev build start lint typecheck format test db:* job:* test:e2e check:colors` |

**Key fact:** the app is designed to run fully **offline in "fixture mode" with
zero keys** — in-memory KV, fixture providers, and committed sample articles.
Every live provider is gated on its env key and degrades to fixtures when absent.

## 2. Data sources & APIs

All vendor calls live in `lib/providers/*` (the only place `fetch()` may target a
third party) and are cached in KV with a TTL. **Pages never call a vendor on
render** — scheduled jobs write to cache/Postgres, pages read via `lib/market/read.ts`
(KV → Postgres → fixture).

| Provider | File | Capability | Env var | Notes |
|---|---|---|---|---|
| Finnhub | `lib/providers/finnhub.ts` | quotes, profile, search | `FINNHUB_API_KEY` | **primary live quotes** (60/min) |
| FMP | `lib/providers/fmp.ts` | fundamentals + quote/profile/search fallback | `FMP_API_KEY` | 250/day |
| Polygon | `lib/providers/polygon.ts` | EOD quotes, candles | `POLYGON_API_KEY` | ~5/min |
| EODHD | `lib/providers/eodhd.ts` | EOD candles, RT fallback | `EODHD_API_KEY` | |
| AlphaVantage | `lib/providers/alphavantage.ts` | last-resort quote/candle/search | `ALPHAVANTAGE_API_KEY` | ~25/day |
| CoinGecko | `lib/providers/coingecko.ts` | crypto quotes | — (keyless) | ~30/min |
| Frankfurter | `lib/providers/frankfurter.ts` | FX (USD conversion) | — (keyless) | §7 peg support |
| FRED | `lib/providers/fred.ts` | US macro series | `FRED_API_KEY` | `/economy` |
| World Bank | `lib/providers/worldbank.ts` | macro/indicators | — | |
| Pexels | `lib/providers/pexels.ts` | cover photos (jobs only, cached) | `PEXELS_API_KEY` | reference URL only, never body |
| Groq | `lib/providers/groq.ts` | AI story summaries (jobs only, cached) | `GROQ_API_KEY`, `GROQ_MODEL` | §2 owner-approved |
| Fixture | `lib/providers/fixture.ts` | always-on fallback | — | last in registry |

Registry + failover/circuit-breaker: `lib/providers/registry.ts`, assembled in
`lib/providers/index.ts`. All server-side.

**Other env:** `CRON_SECRET`, `KV_REST_API_URL/TOKEN` (or `UPSTASH_REDIS_REST_URL/TOKEN`),
`POSTGRES_URL`, `NEXT_PUBLIC_SITE_URL`, `EMBEDDER`, `VERCEL`/`VERCEL_URL`.
Only one `NEXT_PUBLIC_*` var exists (`NEXT_PUBLIC_SITE_URL`) — **no secret is
client-exposed** today.

## 3. News pipeline

- **Ingest** (`lib/curation/ingest.ts`, `app/api/cron/ingest`): RSS via `rss-parser`,
  robots-checked (`lib/curation/robots.ts`), normalised, stored as headline + dek +
  link + timestamp + source. **No body column, ever** (`lib/db/schema.test.ts` guards it).
- **Cluster** (`lib/curation/cluster.ts`, `pipeline.ts`): embeddings (default
  `HashEmbedder`, offline; `all-MiniLM-L6-v2` in the Actions runner when
  `EMBEDDER=minilm`) + overlap boost, single-link within 48h.
- **Rank** (`lib/curation/rank.ts`): weighted sources/tier/market-move/primary × recency.
- **Classify / section** (`lib/curation/classify.ts`, `section.ts`, `content/sections.yaml`):
  deterministic keyword rules. **Model-free.**
- **Summaries**: Groq (`lib/providers/groq.ts`), jobs/backfill only, cached, original prose.
- **Storage**: Postgres via Drizzle (`lib/db/queries/articles.ts`, `wire.ts`).
  Zero-key demo reads committed fixtures (`fixtures/articles.ts`, `articles-body.ts`).

**Scheduling:** one Vercel cron (`vercel.json`: `/api/cron/eod` daily 22:00 UTC);
real intraday cadence runs via GitHub Actions (`.github/workflows/{quotes,ingest,cluster,macro,eod}.yml`)
calling the authed `/api/cron/*` routes.

## 4. Current SEO

| Area | State | File |
|---|---|---|
| Canonical host | `https://www.mizaan.tech` (prod default) | `lib/site.ts` |
| Root metadata | title template `%s · Mizaan Intelligence`; home title just "Mizaan Intelligence" | `app/layout.tsx` |
| Per-route metadata | present on articles; **generic/missing on many routes** | various `page.tsx` |
| JSON-LD | Organization + WebSite(SearchAction) site-wide; NewsArticle on articles | `app/layout.tsx`, `app/news/[slug]/page.tsx` |
| Sitemap | `app/sitemap.ts` (single file — **not yet a split index**) | |
| robots | `app/robots.ts` | |
| RSS | `/feed.xml` only (**no per-section feeds**) | `app/feed.xml/route.ts` |
| OG image | `/api/og` (static title/kicker from query — **not yet per-slug/symbol**) | `app/api/og/route.tsx` |
| Breadcrumbs / author / news-sitemap | **absent** | — |

## 5. Current analytics

**None.** No GA4, Vercel Analytics, Clarity, or Search Console tag anywhere
(`grep` for `gtag`/`@vercel/analytics`/`clarity` → 0 hits). No consent notice.

## 6. Sample / placeholder data (Phase 1 & 2 targets)

- **Fixtures (by design, zero-key mode):** `fixtures/{articles,articles-body,universe,quotes,candles,indices,macro,markets-extra,cover-images,fundamentals}.ts`.
- **User-facing "sample/illustrative" labels** (honest provenance today; Phase 1
  replaces with real source + timestamp once live keys flow, else hides):
  `components/market/Provenance.tsx` (`SampleTag`, "Sample data — not live market data"),
  `components/market/{Movers,AssetTabs,Fundamentals,TickerTape}.tsx`,
  `app/markets/page.tsx`, `app/markets/screener/page.tsx`, `app/page.tsx`, `app/news/[slug]/page.tsx`.
- **GCC indices** (`fixtures/indices.ts`: TASI/ADI/DFMGI) are **illustrative** — no
  configured provider returns real QSE/Tadawul/ADX/DFM EOD values yet (Phase 1 must
  wire a real source or hide the GCC spotlight).
- QAR peg constant: `lib/currency/peg.ts` (3.64).

## 7. Security posture

- ✅ No `NEXT_PUBLIC_*` secret; all provider keys read server-side only.
- ✅ Cron routes authed with `CRON_SECRET` (timing-safe), `lib/jobs/auth.ts`.
- ✅ No article body text stored (schema-guarded).
- ⚠️ **No rate limiting** on public `/api/*` data routes (`/api/market/*`, `/api/wire/search`).
- ⚠️ **No security headers** (HSTS, nosniff, Referrer-Policy, X-Frame-Options, CSP) in `next.config.ts`.
- ⚠️ No `.env.example`; no git-history secret scan on record.
- ⚠️ No AI-crawler policy in `robots.ts` (GPTBot/CCBot/ClaudeBot).
- ℹ️ Data-licence/commercial-display rights not yet documented (Phase 9 / manual).

## 8. Ten-bullet summary

1. Next.js 15 App Router on Vercel, pnpm, TS strict; **not a monorepo**.
2. Runs fully offline in **fixture mode (zero keys)** — removing fixtures without live keys blanks the site (**Phase 1 dependency**).
3. All vendor calls isolated in `lib/providers/*`, cached in KV; pages read cache→DB→fixture and never call a vendor on render.
4. **Finnhub** is the live-quote primary; GCC indices have **no real source** yet (illustrative).
5. News pipeline (ingest→cluster→rank→classify) is **deterministic/model-free**; only summaries use Groq.
6. SEO basics exist (canonical host, Org/WebSite/NewsArticle JSON-LD, sitemap, robots, one RSS) but lack per-route titles, split sitemaps, news-sitemap, breadcrumbs, author entity, per-slug OG.
7. **No analytics or consent** of any kind.
8. "Sample/illustrative" labels are deliberate honesty, not bugs — they convert to real source stamps only once live data flows.
9. Security gaps: no rate limits, no security headers, no `.env.example`, no AI-crawler policy.
10. No secret is currently exposed client-side; `CRON_SECRET` protects internal routes.

## 9. Cross-cutting note for later phases

Phase 1 ("remove all sample data") and Phase 2 ("every story needs a real
resolving source URL") **presuppose live provider keys + a populated Postgres**.
With zero keys the honest path is to *hide* empty widgets (return `null`), not to
invent data. Sequence the live-data keys (Finnhub, FRED, KV, Postgres — see
`DEPLOY.md`) **before** Phase 1/2 can show real numbers; until then those phases
build the validation/dedup machinery and the hide-when-empty behaviour.
