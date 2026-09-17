# CLAUDE.md — Mizaan Intelligence (MarketIntelligence 2.0)

> Brand: **Mizaan Intelligence** (wordmark MIZAAN + "intelligence"). Theme (ref:
> YureCorp business landing): **dark default** is near-black neutral with a bold
> **orange** accent; light is a warm off-white with the same orange. The accent
> token is still named `--iris` (= "the accent") across the code. Rounded cards +
> soft shadows; `.accent-panel` is the warm surface. Data colour (gain/loss) stays
> reserved for price direction.

Standing rules for this repository. Condensed from the master prompt (§2, §3, §4,
§10, §17). These are non-negotiable; read them before writing code.

## What this is

Financial news, market data and **signal-ranked** intelligence. We don't beat the
wires on speed or licensed data — we beat them on **signal**: which stories matter,
which instruments they move, how markets responded.

**The signal is deterministic; the summaries are AI.** Clustering, ranking, entity
extraction and the session recaps are computed **deterministically** from data we
hold — no model in the loop, and that stays true. On top of that, each story now
carries an **AI-written summary** (owner decision, 2026-09 — this lifted the
former "V1 has no LLM" rule): original prose synthesised from the story's facts and
cited sources via Groq (`lib/providers/groq.ts`). Rankings are facts about
coverage; summaries are AI interpretation — keep the two visibly distinct, label
the AI content, and never imply the *rankings* are AI-written.

## Hard constraints (non-negotiable — §2)

- **No paid APIs, no paid SaaS, no metered AI in V1.** Free tiers only. Signup keys
  (Finnhub, FRED, Twelve Data) are fine; anything that can generate a bill is not.
- **LLM use is limited to AI summaries via Groq** (owner-approved, free tier), and
  only in scheduled jobs / the backfill script — never on page render, always
  cached (§2), and always original content (never source text, §10). No other
  hosted-model key, and the *ranking/clustering* engine stays model-free.
- Next.js 15 App Router, TypeScript `strict: true`. Vercel deployment. Vercel
  Postgres (Neon) + pgvector + Vercel KV, free tiers.
- **All external calls go through `lib/providers/*`.** No component ever calls a
  vendor URL. `lib/providers/*` is the only place `fetch()` may target a third party.
- **Every external call is cached in KV with an explicit TTL.** An uncached call to a
  rate-limited vendor is a bug. Pages never trigger vendor calls — quotes are fetched
  in scheduled batches, written to KV/Postgres, served from cache.
- The site renders useful content with **zero keys configured** (fixture mode).
  Missing keys degrade gracefully.
- Lighthouse: Performance ≥ 90 mobile, Accessibility ≥ 95, CLS < 0.05, LCP < 2.0s.
- 90-day retention on `articles` and intraday candles from Phase 1, in the EOD job.

## Scheduling (§3)

Vercel Hobby caps cron at once-per-day. **Split trigger from compute:**

- `/api/cron/*` routes are plain HTTP endpoints authed with
  `Authorization: Bearer ${CRON_SECRET}` (401 otherwise).
- **GitHub Actions** scheduled workflows call those routes on real intraday
  schedules, and run the heavy ingest/cluster work in the runner (full Node, local
  embeddings) writing directly to Postgres. Vercel serves pages only.
- Keep **one** daily job in `vercel.json` (EOD/retention) so the Vercel path stays
  exercised. Every workflow gets `workflow_dispatch` + a concurrency group.

```
ingest.yml  */10 * * * *   cluster.yml */20 * * * *   quotes.yml */5 * * * *
macro.yml   0 */6 * * *    eod.yml     0 22 * * *      (all UTC)
```

## Stack (exact — §4)

Next.js 15 App Router / React 19 (Server Components default; `'use client'` only for
interactivity) · TypeScript 5 `strict` (no `any` outside typed shims) · Tailwind v4 +
CSS custom properties · shadcn/ui **heavily restyled** (never ship the default look) ·
Lightweight Charts (price) + Recharts (macro) · Vercel Postgres + pgvector via Drizzle
(migrations committed) · Vercel KV · `@xenova/transformers` model
`Xenova/all-MiniLM-L6-v2` (384-dim, local, no key) · Zod at every boundary ·
`rss-parser` · GitHub Actions + one Vercel cron · Vitest + Playwright · ESLint +
Prettier + `tsc --noEmit`. **Single Next.js app, not a monorepo.**

## Content & legal (§10) — stricter because there is no analysis layer

**Permitted:** headline, dek (≤ 40 words), source name, timestamp, outbound link; our
own computed narrative from price/volume/macro data; full use of primary sources
(filings, central-bank statements, exchange notices, government stats, press
releases); quoting ≤ 25 words from any single article, quoted, attributed, linked.

**Forbidden, enforced in code:**
- Any column, cache or file containing **third-party article body text**. The
  `articles` table has **no body column, ever**.
- Scraping behind a paywall or disallowed by `robots.txt` — robots check lives
  **inside** the fetcher.
- Ingesting from any source absent from `content/sources.yaml` with an explicit
  `license_note`.
- Rendering a dek longer than 40 words (truncate at the formatter + "read at source").

## Dual currency (§7)

Storage is always **USD**. QAR is presentation only, pegged **3.64 QAR = 1 USD**
(constant in `lib/currency/peg.ts`, with `pegReviewedOn`). Convert non-USD
instruments to USD at ingestion (Frankfurter), store the rate used, never re-derive
history with today's rate. **Percentages, ratios and index levels are
currency-neutral — never convert them** (unit-tested rule). Toggle persists in a
cookie so Server Components render the right figures without a client flash.

## What not to do (§17)

- No hosted-model key other than Groq for summaries; keep ranking/clustering model-free.
- Never imply the rankings/recaps are AI-written; always label the AI summaries and
  carry the not-advice + verify-against-sources disclaimer.
- Never call vendor APIs from React components or on page render.
- Never store or display third-party article bodies.
- No sub-daily cron expression in `vercel.json` (Hobby deploy fails).
- Never convert percentages, ratios or index levels between currencies.
- Never ship default shadcn styling.
- No `any`, no inline ESLint-disable, no committed secrets, no skipping the gates.

## Design one-liner (§12)

Chrome is monochrome; **colour belongs to data**. Saturated colour comes only from
(a) price direction (`--gain`/`--loss`, always paired with ▲/▼ and a sign — never
colour alone) and (b) the `--iris` accent, reserved **exclusively** for our own
computed content (recaps, scores, source counts) — it *means* "this is ours". Type:
Newsreader (headlines/recaps), Geist Sans (UI), Geist Mono `tabular-nums` (all
figures). Hairline rules + surface elevation, not shadows.

## Curation engine tuning (§9) — recorded per the Phase 4 gate

**Embeddings.** Default is `HashEmbedder` (deterministic, offline, 384-dim) so the
build/tests/wire run with no model. The mandated `all-MiniLM-L6-v2` (via
`@xenova/transformers`) is used in the Actions runner when `EMBEDDER=minilm`; it
loads dynamically and never enters the Next serving bundle.

**Clustering** (`lib/curation/cluster.ts`): score = embedding cosine + overlap
boost, single-link within a 48h window. With the HashEmbedder, paraphrase cosine
is weak, so the overlap boost dominates: `BOOST_TICKER=0.30`, `BOOST_ENTITY=0.30`,
`BOOST_TOPIC=0.10` (cap 0.45), `SIM_THRESHOLD=0.50`. Evidence: on the fixture wire
this merges one Fed decision across four sources into **one** cluster and one
OPEC+ story across three, while keeping the SEC enforcement and Apple items as
singletons (`lib/curation/pipeline.test.ts`). With `EMBEDDER=minilm`, lower boosts
to ≈0.12 and raise `SIM_THRESHOLD` toward ~0.68 pure cosine.

**Ranking** (`lib/curation/rank.ts`), weights sum to 1, one place, tunable:
`W_SOURCES=0.40` (distinct sources, log-scaled), `W_TIER=0.20` (regulator/primary
1.0, wire 0.7, outlet 0.4), `W_MARKET=0.25` (max |move| of tickers / 5%),
`W_PRIMARY=0.15` (a regulator/primary source present). Multiplied by a recency
factor (18h half-life, floored at 0.30 so covered news doesn't vanish).

**Legal invariant.** `articles` has no body column — guarded by
`lib/db/schema.test.ts`. robots.txt is checked inside the fetcher
(`lib/curation/robots.ts`). Only sources in `content/sources.yaml` with a
`license_note` are ingested.

## Sections & editorial mix (§13)

Every cluster gets a **section** — the top-level editorial vertical — assigned
**deterministically** by keyword rules in `content/sections.yaml`
(`lib/curation/section.ts`), exactly like topics/entities. No model.

- Financial verticals (`financial: true`): **markets**, **economy**. Everything
  else — **technology** (Tech & AI), **health**, **sports**, **entertainment**
  (Culture), **science** — is non-financial.
- **Product rule:** Mizan is markets-first, but at least **~30%** of the live wire
  is deliberately non-financial to keep a broad audience engaged. Guarded by
  `lib/curation/section.test.ts` (currently 33%). Non-financial stays a minority.
- Non-financial feeds live in `content/sources.yaml` under the same rules: primary
  gov/agency feeds (NASA, WHO, CDC, BLS, World Bank) are public-domain/open;
  commercial outlets are added headline+dek+link only and left `active: false`
  pending feed/terms verification (§6, §10).

**Images.** Cards carry a cover image. `RawArticle.imageUrl` is an optional
**reference** (a URL / og:image), never stored body text — the no-body invariant
still holds. When absent, `components/news/CoverArt.tsx` renders a deterministic,
on-brand SVG cover (offline, no vendor call on render). Section covers/tags use a
**muted section tint** for the motif only — it avoids gain-green / loss-red and
never touches chrome or data, so §12 holds.

## Build discipline (§14)

Work **phase by phase**. At each gate: stop, report what was built, show acceptance
evidence, **wait for approval**. Conventional commits, one feature branch per phase.
