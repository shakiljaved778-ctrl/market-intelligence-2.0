# CLAUDE.md — Mizaan Intelligence (MarketIntelligence 2.0)

> Brand: **Mizaan** (wordmark MIZAAN + "intelligence"), domain **mizaan.tech**.
> Theme (rebrand): **dark default** is a warm **charcoal-black** canvas (`#0b0a09`,
> no blue cast) with a restrained **warm-brown / caramel** accent and fine film
> grain; light is a warm cream with near-black ink. Bold modern sans display (Geist,
> `.display`, weight 700/800, tight tracking), Newsreader for editorial body, Geist
> Sans UI, Geist Mono figures. The accent is that **brown** (`--iris` = "the
> accent", caramel `#c0875a` on dark / rich brown `#8a5a30` on light; `--on-iris` is
> the text that sits on it), reserved for OUR OWN computed content — distinct from
> the monochrome chrome and from price-direction green. Large rounded cards
> (`--r-card` 20px) + soft, warm shadows; `.accent-panel` is a near-black warm panel
> with a faint amber glow (kept subtle, not a coloured wash). Data colour (gain/loss)
> stays reserved for price direction, always with a glyph + sign.

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

- **Paid services need the owner's named approval** (owner decision, 2026-11-12 —
  this replaced "no paid APIs, no paid SaaS"). A paid data feed, scheduler, host or
  payment gateway may be used only when the owner has approved that specific
  service with its monthly cost stated first. Never sign up, upgrade or add a
  billable key on your own. Free signup keys (Finnhub, FRED) are fine.
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
- **Never display a fabricated number** (owner decision, 2026-11-12 — this replaced
  "the site renders useful content with zero keys / fixture mode"). In production a
  missing value renders an honest empty state. `fixtures/` is sample data for
  `DEMO_MODE=1` only (local dev, unit tests, visual tests); it is reachable solely
  through `lib/demo/` (plus `lib/content/authored.ts` for the authored Eureka
  explainers), and `pnpm check:fixtures` fails CI on any other import. Never set
  `DEMO_MODE` in production.
- **Every price carries its source and its time** (and its delay, if any). Read
  prices through `lib/market/service.ts` (`getQuote` / `getSeries`), which returns
  `{ status, value, source, asOf, delayMinutes }`; render the stamp with
  `PriceStamp`. Draw a percentage move with `ChangePill` so glyph, sign and colour
  come from one number.
- Business details (operator, location, contact, editor) live in
  `content/site.config.ts`. A `null` field is hidden, never shown as a placeholder.
  Ask the owner for values; do not invent them.
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

- Never show a sample, illustrative or generated figure in production — an empty
  state is the only acceptable substitute for missing data.
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
singletons (`lib/curation/pipeline.test.ts`). Country entities (e.g. Qatar) do not count towards the entity
boost: a national news agency names its country in nearly every story, so a shared
country is not a shared event (same test file). With `EMBEDDER=minilm`, lower boosts
to ≈0.12 and raise `SIM_THRESHOLD` toward ~0.68 pure cosine.

**Ranking** (`lib/curation/rank.ts`), weights sum to 1, one place, tunable:
`W_SOURCES=0.40` (distinct sources, log-scaled), `W_TIER=0.20` (regulator/primary
1.0, wire 0.7, outlet 0.55), `W_MARKET=0.25` (max |move| of tickers / 5%),
`W_PRIMARY=0.15` (a regulator/primary source present). Multiplied by a recency
factor (18h half-life, floored at 0.18 so covered news doesn't vanish but stale
stories decay below fresh ones). The outlet tier (0.55) and floor (0.18) were
tuned up/down from 0.4/0.30 so fresh reputable-outlet stories (e.g. The
Conversation) surface on the homepage instead of sitting under week-old feeds.

**Legal invariant.** `articles` has no body column — guarded by
`lib/db/schema.test.ts`. robots.txt is checked inside the fetcher
(`lib/curation/robots.ts`). Only sources in `content/sources.yaml` with a
`license_note` are ingested.

## Sections & editorial mix (§13)

Every cluster gets a **section** — the top-level editorial vertical — assigned
**deterministically** by keyword rules in `content/sections.yaml`
(`lib/curation/section.ts`), exactly like topics/entities. No model.

- Financial verticals (`financial: true`): **markets**, **economy**, **crypto**
  (digital assets) and **realestate** (housing/property). Crypto & real estate are
  checked ahead of the generic "any instrument → markets" fallback in
  `classifySection` so a ticker-bearing story isn't swallowed by markets.
  Everything else — **technology** (Tech & AI), **health**, **sports**,
  **entertainment** (Culture), **science**, **world** (geopolitics) and **eureka**
  (Nobel ideas) — is non-financial.
- **Product rule (owner decision, 2026-11-12):** markets and economy LEAD, with
  GCC first. Non-finance sections keep their own pages but are capped to one row
  each on the homepage. This replaces the old "at least ~30% non-financial" rule;
  the old guard in `lib/curation/section.test.ts` is replaced in Phase 2 of
  `docs/IMPLEMENTATION_PLAN.md`.
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

## Rules for every task

Updated 2026-11-12 with the owner's approval (see `docs/IMPLEMENTATION_PLAN.md` §8).
The earlier blanket bans on visual, navigation and copy changes are replaced by the
scoped rules below.

- **Visual design.** Until the owner picks a palette direction in Phase 3, build new
  states and components from the EXISTING tokens, class names and components only —
  no new colour, font or spacing value. Phase 3 (and only Phase 3) may change the
  design system, after the owner approves a direction from screenshots.
- **Navigation and layout.** Keep every existing URL working (add a redirect if a
  route must move). The homepage layout and section order may change as the plan
  requires. Do not remove or rename a section without the owner's say-so.
- **Brand.** Positioning stays "GCC and global market intelligence". Copy must only
  claim what the site delivers today; a claim that is not true must be rewritten,
  and the rewrite shown to the owner in the phase report. Do not change the logo.
- Prefer server-side, data-layer, metadata and config changes over UI changes.
- Before editing, show a plan listing the files you will touch. After editing, list
  what changed and why.
- Never expose API keys to the client. Never commit secrets. List every new
  environment variable in `.env.example` with a comment.
- Informational only: no personalised buy, sell or hold language anywhere.
- Run lint, type-check, tests, `pnpm check:fixtures` and a production build before
  declaring a task done. Stop at the end of each phase and wait for the owner.
