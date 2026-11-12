# Mizaan Intelligence — Implementation Plan

**Phase 0 deliverable: audit and plan. No application code was changed.**
Audit date: 12 Nov 2026. Code audited at `main` = `ab88221`. Live site audited at
https://www.mizaan.tech between 12:30 and 14:50 UTC.

How the evidence was gathered:

- **Code**: read directly from this repository (paths are given for every root cause).
- **Live site**: page HTML fetched and rendered in a headless browser at 380 px and
  1440 px, dark theme.
- **Jobs**: GitHub Actions run history and job logs.
- **Not available to me**: the Vercel project's environment variables, the production
  database and the provider dashboards. Anything that depends on those is marked
  **unverified** and listed as a question in section 9.

---

## 1. Headline conclusions

1. **Almost no number on the site is real.** The ticker, FX, commodities, crypto tab,
   sector heatmap, session recap, every screener row, every economy tile and the
   economic calendar are read from files in `fixtures/`. Some are labelled "sample";
   several are labelled with a real source name ("FRED", "World Bank") even though the
   value is a fixture. This is the most serious problem and it is wider than the
   external audit reported.
2. **A real quote feed exists but never reaches a reader.** The quotes job does fetch
   real prices (65 of 78 symbols on the last successful run), but the scheduler runs it
   every 4 to 8 hours instead of every 5 minutes, the cache lifetime is 45 seconds, and
   a 24-hour staleness rule then discards what is left. The pages fall back to fixtures.
3. **The Shariah flags are invented.** The screener's "Shariah" column is a hand-typed
   true/false in `fixtures/universe.ts` (84 yes, 18 no, 18 blank). There is no screening
   method, no ratios and no data behind it. The paid tier cannot be built on this until
   a real, documented, rule-based screen replaces it.
4. **The wire has no GCC content because no GCC source is active.** 13 feeds are active;
   all are US, UK, EU or global. The two Qatar feeds were switched off after returning
   nothing. NASA alone produces most of the volume.
5. **Ranking is frozen, not decayed.** A story's score is written once and never
   recalculated after it leaves the 48-hour clustering window, and the page sorts on
   that stored score. Median story age on the live wire is 41 days.
6. **Scheduling and hosting are not reliable enough for a daily product.** GitHub's
   scheduler delivered 307 quote runs in total where the schedule asks for 288 per day.
   The site returned `402 DEPLOYMENT_DISABLED` twice in four days (8 to 9 Nov, and
   11 Nov 16:22 UTC to about midday 12 Nov).
7. **Several goals in the brief conflict with the standing rules in `CLAUDE.md`** (no
   paid services, no visual changes, no tagline changes). Those rules need your explicit
   decision before Phase 1. See section 8.

---

## 2. Repository map

| Area | What is there |
| --- | --- |
| Framework | Next.js 15.5 App Router, React 19, TypeScript strict, Tailwind v4. Single app, pnpm. |
| Hosting | Vercel (Hobby plan, inferred from the once-a-day cron limit in `vercel.json` and `CLAUDE.md`). Domain `www.mizaan.tech`. |
| Database | Postgres (Neon via Vercel) with pgvector, Drizzle ORM. Schema `lib/db/schema.ts`, 5 migrations in `lib/db/migrations/`. |
| Cache | Vercel KV / Upstash Redis over REST, with an in-memory fallback (`lib/cache/store.ts`). TTLs in `lib/cache/ttl.ts`. |
| Tables | `sources`, `articles` (no body column), `clusters`, `cluster_articles`, `recaps` (unused), `instruments`, `quotes`, `candles_daily`, `fundamentals`, `fx_rates` (unused), `macro_series` and `macro_obs` (unused), `calendar_events` (unused), `job_runs`. No user, subscriber, watchlist or payment tables. |
| News ingestion | `jobs/ingest.ts` → `lib/curation/ingest.ts`. RSS/Atom only, via `rss-parser`. Robots check inside the fetcher (`lib/curation/robots.ts`). Sources in `content/sources.yaml`. Stores headline, dek (40 words max), URL, time, source. |
| Clustering and ranking | `jobs/cluster.ts` → `lib/jobs/tasks.ts` `clusterTask` → `lib/curation/pipeline.ts` (classify → cluster → rank). Deterministic. Embeddings: hash embedder by default, MiniLM when `EMBEDDER=minilm`. |
| Signal ranking | `lib/curation/rank.ts`. Score = 100 × (0.40 source count + 0.20 source tier + 0.25 price move + 0.15 primary source) × recency factor (18-hour half-life, floor 0.18). |
| Classification | Keyword rules. Tickers, entities, topics: `lib/curation/classify.ts` with `content/tickers.yaml`, `entities.yaml`, `topics.yaml`. Sections: `lib/curation/section.ts` with `content/sections.yaml`. |
| AI summaries | Groq, `lib/providers/groq.ts`, called only inside the cluster job for the top 48 clusters, stored on `clusters.brief_md`. 150 to 210 words, written from headline and deks. |
| Cover images | Pexels search in the cluster job (`lib/providers/pexels.ts`); fallback is a random photo from `picsum.photos` (`components/news/CoverArt.tsx:164`). |
| Market data providers | `lib/providers/`: Finnhub, FMP, Polygon, EODHD, CoinGecko, Alpha Vantage, FRED, World Bank, Frankfurter, plus a fixture provider. Registry with failover and circuit breaker in `registry.ts`. |
| Market read path | `lib/market/read.ts`: KV → Postgres → fixture. Sanity checks in `lib/market/sanity.ts`. |
| Scheduling | GitHub Actions cron. `ingest` and `cluster` run in the runner and write to Postgres. `quotes`, `macro`, `eod`, `briefing` call `/api/cron/*` on Vercel with `CRON_SECRET`. One Vercel cron (`eod`). |
| Email | Resend over REST (`lib/newsletter.ts`, `lib/contact.ts`, `lib/briefing.ts`). Double opt-in, unsubscribe and a briefing builder exist. Whether Resend is configured in production is unverified. |
| Accounts, payments, analytics | None. |
| Tests and gates | Vitest (151 tests), Playwright smoke and visual regression (36 screenshots), ESLint, Prettier, `tsc`, a colour-token check. CI in `.github/workflows/ci.yml`. |

---

## 3. The 15 audit findings: reproduction and root cause

"Reproduced" means I saw it on the live site on 12 Nov. Each row names the phase that
fixes it.

| # | Finding | Reproduced | Root cause | Proposed change | Phase |
| --- | --- | --- | --- | --- | --- |
| 1 | No GCC stories | Yes. 0 of 56. | No active GCC source. `content/sources.yaml` has 13 active feeds, none from the Gulf. `qcb-news` and `qse-disclosures` are `active: false` because their feed URLs returned no items. The ingester only understands RSS/Atom, and most GCC official sources do not publish a usable feed. | Source adapter interface with one adapter per source (RSS, JSON API, HTML listing page), each with its own terms and robots check. Add a `region` to every article and cluster. | 2 |
| 2 | Feed mix off-brand | Yes. Science 20, Eureka 14, Markets 14, Health 4, Economy 2, Tech 1, Culture 1. 71% non-financial. | Volume follows whichever feed publishes most (NASA). The only guard is a test that requires at least 30% non-financial content, which pushes the wrong way. Eureka is 14 evergreen fixture stories merged into the live wire (`lib/news/read.ts` `loadAll`). | Per-source daily caps; homepage quota by section; reverse the test so finance and GCC must lead; keep Eureka on its own page only. | 2 |
| 3 | Ranking ignores age | Yes. Top stories 41 and 50 days old with scores near 50. | `persistClusters` (`lib/db/queries/articles.ts`) writes `importance_score` at cluster time. The cluster job only re-ranks articles from the last 48 hours, so an older cluster keeps its last score for ever. `dbReadWire` (`lib/db/queries/wire.ts`) then sorts by that stored score with no age filter. `lib/curation/freshness.ts` exists but is not wired in. | Store the undecayed base score; apply the recency decay at read time; hard cut-off of 72 hours for any top homepage slot; mark old clusters `stale`. | 2 |
| 4 | Misclassified stories | Yes. NASA items under Markets and Health. | Three defects in `lib/curation/section.ts` and `classify.ts`. (a) Matching is case-insensitive, so the Health keyword `who` matches the word "who" and `health` matches any NASA health item. (b) First match in file order wins, and Science is last. (c) Anything with no keyword match defaults to Markets, and any "ticker" forces Markets (see finding 11). | Score-based classifier; case-sensitive acronyms; per-source default section and allowed sections; no default to Markets (use a neutral "General" bucket that never reaches the homepage). Tests built from the misfiled NASA headlines. | 2 |
| 5 | Sample data under a "live" tagline | Yes. Every mover and screener row says "sample". | See headline conclusions 1 and 2. The real feed is discarded by a 45-second TTL (`lib/cache/ttl.ts` `quoteLive`), a job cadence of hours, and the 24-hour stale rule (`lib/market/sanity.ts`). The ticker (`components/market/TickerTape.tsx`), FX and commodities (`fixtures/markets-extra.ts`), and heatmap (`app/markets/page.tsx`) import fixtures directly and have no live path at all. The "live" wording is in `app/layout.tsx:27-33`. | One quote service with `source`, `asOf`, `delayMinutes`; last-known-good storage in Postgres; empty states instead of fixtures; honest copy. | 1 |
| 6 | Recap built on sample data | Yes. | `lib/narrative/read.ts` builds every recap from `fixtures/indices.ts` and `fixtures/universe.ts`. The `recaps` table is never written. | Build the recap in the EOD job from stored real closes, persist it with its inputs, and publish nothing when coverage is below the threshold. | 1 |
| 7a | Heatmap has no tiles | Partly. Tiles render in a browser after JavaScript loads. The server HTML contains none, labels are dark text on dark tiles, and all values are fixtures. | `components/market/SectorHeatmap.tsx` uses a Recharts `ResponsiveContainer`, which draws nothing until it can measure the browser. Data comes from `fixtures/universe.ts`. | Server-rendered CSS grid heatmap from real quotes, with readable labels and an empty state. | 1 |
| 7b | Commodities and Crypto tabs empty | Partly. They fill after a click (5 and 6 rows). Without JavaScript only FX exists. All rows are fixtures. | `components/market/AssetTabs.tsx` is client state over fixture arrays. | Real data per tab, server-rendered panels, empty state where there is no feed. | 1 |
| 7c | Session clocks show no times | Yes. Only "Open", "After hours", "EOD · prior close". | `app/markets/page.tsx` prints `sessionFor(code).label`; open and close times exist in `lib/format/session.ts` but are never displayed. | Show open and close in the reader's local time and in Doha time, with a countdown. Add Tadawul, ADX and DFM. | 1 |
| 7d | "Movers" heading twice | Yes. | `app/page.tsx` and `app/markets/page.tsx` render an `<h2>Movers</h2>`, and `components/market/Movers.tsx` renders its own. | Remove the inner heading. | 1 |
| 8a | Screener: blank 30-day trend | Not as described. A line is drawn for every row. The real defect is worse: the line is generated by a seeded random function (`fixtures/candles.ts`), so it is a made-up trend. | `readCandles` falls back to `fixtureCandles`. | Real candles or a dash. Never a generated series. | 1 |
| 8b | Screener: sign mismatch | Yes (XRP, DOGE, TRX show a flat dash beside a signed percentage). | The glyph and colour come from `row.change`; the number comes from `row.changePct`. The two fields can disagree (3 fixture rows have `change: 0`; live quotes can differ by rounding). | One `ChangePill` component that derives glyph, sign and colour from a single value. | 1 |
| 8c | Screener: no sort, no pagination | Yes. 120 rows on one page, fixed order. | `app/markets/screener/page.tsx` sorts by change only and renders everything. | Sortable column headers and pagination through URL parameters, server-side. | 1 (basic), 5 (Pro filters) |
| 8d | Screener: 9 QSE names, no Tadawul, ADX, DFM | Yes. | The universe is `fixtures/universe.ts`: 84 US, 9 London, 9 Qatar, 18 crypto. `content/gcc-companies.ts` has 20 QSE names and empty lists for the other three exchanges. | Instrument master table for the four exchanges, loaded from a verified list. | 2 |
| 9 | Date banner and recap date differ | Yes. Banner "11 Nov 2026", recap `session-close-2026-11-12`. | The banner (`app/page.tsx`) prints the UTC date of the newest story. The recap date (`lib/narrative/read.ts` `demoDate`) is a fixture date shifted onto today. | Banner shows today's date in Doha time. Recap carries the date of the session it describes. | 1 |
| 10 | Duplicate stories, entries with no summary | Yes. 8 of 28 homepage stories appear twice or more, 2 appear three times. | `app/page.tsx` fills the hero, the three-up row, the section blocks and the "Latest" list from the same array without tracking what was already shown. Compact cards never show a summary. | A single homepage layout function that assigns each story to exactly one slot. Hide entries with no summary. | 2 |
| 11 | Unexplained ticker tags, unlabelled "CB" | Yes. Tags such as NOW, LOW, DEC, SOL, DE, AXP on NASA and central-bank stories. | `classify.ts` matches the bare ticker symbol case-insensitively, so "now", "low", "Dec", "de" become tickers. The tag (`components/ui/InstrumentChip.tsx`) has no label. "CB" is the colour-blind toggle (`components/layout/ColorblindToggle.tsx`); it has an accessible name and tooltip but the visible text is cryptic. | Match symbols case-sensitively and only with market context (`$NOW`, `(NYSE: NOW)`), otherwise by company name. Tags link to stock pages with the company name in a tooltip. Replace "CB" with a labelled control in a display-settings menu. | 1 (CB), 2 (tags) |
| 12 | Newsletter: two labels, no visible field | Yes. | In the footer form (`components/news/NewsletterSignup.tsx`) the input background equals the footer background and the border is a hairline, so the field is nearly invisible. A second label belongs to a required consent checkbox. | One visible email field and one button. Consent stated in a line of text under the button, with double opt-in doing the confirmation. | 1 (visibility), 4 (full rebuild) |
| 13 | About names no operator | Yes. | `app/about/page.tsx` is static copy. The editor's name exists only in `lib/author.ts`. | `content/site.config.ts` holding operator, location and contact; About and Contact read from it. | 1 |
| 14 | No monetisation | Yes. | Nothing built. No user or payment tables. | Phases 4 and 5. | 4, 5 |
| 15 | Generic stock photos | Yes. | Pexels keyword search per cluster; fallback is a random `picsum.photos` image, which is also an unlisted third-party request from the browser. The same Pexels image repeats across stories. | Remove picsum now. Section-styled generated covers, or no image. | 1 (remove picsum), 3 (cover system) |

---

## 4. Additional findings from this audit

| # | Finding | Evidence | Proposed change | Phase |
| --- | --- | --- | --- | --- |
| A1 | Economy page shows fixture values labelled "FRED" and "World Bank" | `lib/economy/read.ts` returns `fixtures/macro.ts` unconditionally. The macro job fetches FRED but nothing reads the result. Live tiles show round values such as "US 10Y Treasury 4%". | Persist macro observations (`macro_obs` already exists) and read them; empty state otherwise. | 1 |
| A2 | Economic calendar is invented | `readCalendar` returns `CALENDAR_EVENTS` from fixtures. | Real calendar source or remove the page from navigation until one exists. | 1 |
| A3 | Shariah flags are invented | `fixtures/universe.ts`, `isShariahCompliant` typed by hand. Methodology page does not mention Shariah. | Hide the column and filter until a rule-based screen exists; then build it on real fundamentals with a stored ratio breakdown. | 1 (hide), 2 (build) |
| A4 | Scheduler does not deliver the schedule | `quotes.yml` is `*/5`; recent successful runs were at 08:17, 01:28, 21:34, 15:49, 07:43, 00:34 UTC. Ingest has 310 runs in total against a `*/10` schedule. | Move triggers to a scheduler that keeps time (see question Q4). Keep GitHub Actions for the heavy runner work, triggered by `workflow_dispatch`. | 1 |
| A5 | Hosting outages | `402 DEPLOYMENT_DISABLED` on 8 to 9 Nov and 11 to 12 Nov. Every job that calls Vercel failed during both. | Resolve the account state; see question Q3. Add uptime monitoring in Phase 6. | 1, 6 |
| A6 | Homepage statistics mislead | "56 stories ranked today" counts the whole wire, including stories 93 days old. "71% beyond markets & economy" advertises the off-brand mix. | Remove or replace with true figures (stories in the last 24 hours, GCC stories today). | 1 |
| A7 | Footer and disclaimer overclaim | "Every price states its delay and source"; "Market & macro data from FMP, Finnhub, FRED and the World Bank". Neither is true of what is displayed today. | Rewrite after Phase 1 so each statement is true. | 1 |
| A8 | Horizontal scroll on mobile | At a 380 px viewport the home and markets pages are 410 px wide. | Fix the overflowing rows (FX rows, ticker container). | 1 |
| A9 | Editor's pick is pinned regardless of age | `content/featured.yaml` matches any title containing "nvidia". The current pick is a single-source story, 3 days old, whose summary was written from its headline because the article could not be read. It makes an allegation about a named person. | Editor's picks expire after 72 hours and require an explicit slug. I recommend removing the current entry; see question Q12. | 1 |
| A10 | Quote persistence loses information | `persistQuote` stores no delay value and writes every instrument as `equity`; `dbLatestQuote` reads the delay from `instruments`, which is `0` for rows it created. A delayed quote read back from Postgres would be shown as real-time. | Store `delay_minutes` and `source` on each quote row. | 1 |
| A11 | Documented theme and live theme differ | `CLAUDE.md` describes a warm charcoal and caramel theme. The live site renders blue-black with a blue accent. | Settle in the Phase 3 design proposal. | 3 |
| A12 | Heavy pages | Screener HTML is 1.2 MB (120 rows rendered twice, once for mobile and once for desktop). Home is 477 KB. | Pagination and a single responsive table. | 1, 3 |

---

## 5. Data providers and GCC coverage

What the code calls today (`lib/providers/*`, `docs/DATA-LICENCES.md`):

| Provider | Used for | Plan assumed in code | Covers GCC exchanges? |
| --- | --- | --- | --- |
| Finnhub | Quotes, profiles, search | Free, 60 calls/min | Free plan is US-listed only. `lib/jobs/tracked.ts` deliberately tracks no GCC symbol. |
| FMP | Fundamentals, fallback quotes | Free, 250 calls/day | Not on the free plan. |
| Polygon | Candles, EOD quotes | Free, about 5 calls/min | No. US markets only. |
| EODHD | EOD candle backfill | Free | Not on the free plan. |
| Alpha Vantage | Last-resort fallback | Free | Not relied on. |
| CoinGecko | Crypto | Keyless public tier | Not applicable. |
| FRED | US macro | Free | Not applicable. Fetched but never displayed (A1). |
| World Bank | Annual indicators | Free | Annual GCC macro only. Not wired to the page. |
| Frankfurter | FX conversion | Free (ECB rates) | Daily reference rates only; not a live FX feed. |

**I could not test any endpoint.** This environment holds no provider keys and I cannot
read the production configuration, so "what each endpoint returns for GCC exchanges"
remains open. What the evidence does show:

- Some real provider is answering in production: the last successful quotes run returned
  65 of 78 symbols, and only 3 symbols exist in the fixture provider.
- Nothing in the code requests an index level, an FX rate, a commodity price or any GCC
  instrument from a real provider. The cache key `market:index:<symbol>` that the GCC
  spotlight reads is never written by any job.

**Consequence:** real GCC prices need a provider that the project does not have. On every
candidate I know of (Twelve Data, EODHD, FMP paid tiers, or a licence direct from each
exchange) GCC coverage sits on a paid plan, and public display normally needs a display
or redistribution licence on top. I have not verified current plans or prices. Phase 1
starts with a short written comparison for you to choose from, tested with trial keys
before anything is bought. Until then GCC price surfaces show an honest empty state.

Free plans from the US providers are generally limited to personal or non-commercial
use. Once the site carries sponsors or a paid tier, each provider's commercial terms
must be confirmed (already flagged in `docs/DATA-LICENCES.md`).

---

## 6. Proposed work, by phase

Each phase is one pull request from the working branch, with lint, type-check, tests and
a production build run before every commit, and a stop for your approval at the end.

### Phase 1: Truth and trust

1. **Quote service.** `lib/market/service.ts` exposing `getQuote(symbol)` and
   `getSeries(symbol, range)`. Result type:
   `{ status: "ok" | "eod" | "unavailable", value, source, asOf, delayMinutes }`.
   Reads last-known-good from Postgres; the cache is only an accelerator. No fixture
   fallback in production code paths.
2. **Fixtures leave production.** `fixtures/` becomes test-only. Fixture mode stays
   available behind an explicit `DEMO_MODE=1` for local development and visual tests,
   with a banner. A CI check fails the build if the app imports from `fixtures/` outside
   demo mode.
3. **Jobs.** Quotes job also writes index levels, FX and commodities where a provider
   returns them. Reliable trigger (Q4). Staleness becomes a visible "stale" state with
   the last time, not a silent swap to invented numbers.
4. **Source and time on every price surface.** One `PriceStamp` component used by the
   ticker, movers, FX, commodities, crypto, screener, stock pages and recap.
5. **Recap** built from stored closes in the EOD job and persisted to `recaps`.
6. **Widget fixes.** Heatmap, tabs, session clocks, duplicate heading, date banner,
   change pill, screener sort and pagination, mobile overflow.
7. **Economy.** Macro tiles and calendar from stored data, or empty states.
8. **Shariah column hidden** until Phase 2 delivers a real screen.
9. **Copy.** Tagline, meta description, Open Graph, footer, disclaimer, homepage
   statistics. Drafts will be sent to you for approval; nothing is rewritten silently.
10. **Config.** `content/site.config.ts` for operator, location, contact, social links.
    About and Contact read from it.
11. **Controls.** Labelled display-settings control in place of "CB"; every icon button
    gets an accessible name and tooltip.

Acceptance check, refined: the brief asks that a search for "sample" or "illustrative"
returns nothing. A news headline can legitimately contain those words (today's wire has
"Newest Sample, Oldest Rock?"), so the automated check will cover our own interface
strings and every price surface, and exclude third-party headlines.

### Phase 2: GCC content engine

1. **Adapter interface** `lib/sources/adapter.ts`: `id`, `region`, `kind`, `fetch()`,
   `termsCheckedOn`, `robotsAllowed()`. One file per source. A source whose terms or
   robots rules disallow collection is skipped and reported to you.
2. **Sources to assess**, in this order: exchange disclosures (QSE, Saudi Exchange, ADX,
   DFM); central banks and regulators (QCB, SAMA, CBUAE, QFMA, CMA, SCA); news agencies
   (QNA, SPA, WAM); investor-relations pages of the top 30 companies. Several publish in
   Arabic first; headline handling for Arabic sources is a decision (Q10).
3. **Region and section** stored on articles and clusters. Ticker tags link to stock
   pages.
4. **Classifier rewrite** with tests from the misfiled NASA items.
5. **Ranking rewrite.** Base score = coverage and price impact; recency decay applied at
   read time; 72-hour cap for top slots; official documents ranked by publication date.
6. **Homepage selection.** One slot per story; one row per non-finance section; entries
   without a summary hidden.
7. **Instrument master** for the four exchanges, and the **Shariah screen**: stored
   ratios, data date, standard named on the Methodology page, with the statement that it
   is a rule-based screen and not a fatwa. Needs fundamentals data (Q5, Q6).
8. **Stock pages**: price with source, key statistics, Shariah status with ratio
   breakdown, related stories, disclosures.

### Phase 3: Design and UX

Two palette directions with screenshots for you to choose from before any
implementation; type scale; components (sparkline, change pill, heatmap tile, index
card, calendar row, story card); loading, empty and error states; homepage order from
the brief; 380 px first; cover-image system; Lighthouse and WCAG AA; logical CSS
properties for right-to-left readiness. Visual baselines are re-recorded once you
approve the direction.

### Phase 4: Audience capture

Single-field signup in header, mid-article and footer; preference page; Mizaan Morning
template with index table, calendar, Shariah list and a sponsor slot that renders only
when configured; 07:00 Asia/Qatar, Sunday to Thursday, sent only when fresh data exists;
magic-link accounts; watchlists (ten names free) with daily email; price and disclosure
alerts; share cards; analytics events; structured data and sitemap review.

### Phase 5: Monetisation

One `entitlements` module; Pro screener (filters, sort, saved screens, CSV export),
unlimited watchlists, instant alerts, weekly Shariah report; pricing page from config;
payment provider interface with webhooks, renewals, cancellations, failed payments and
receipts; affiliate links labelled "Partner link" with `rel="sponsored"`; Advertise
page; sponsor slots labelled "Sponsored"; minimal admin view. News is never gated.

### Phase 6: Hardening

Alerts on ingestion failure, stale data, failed sends and payment webhooks; stale-feed
indicator on data surfaces; unit tests for ranking, classification, entitlements and the
quote service; end-to-end tests for signup, checkout and screener; README and runbooks.

---

## 7. New environment variables and schema changes

### Environment variables (names are proposals; all go in `.env.example` with a comment)

| Phase | Variable | Purpose |
| --- | --- | --- |
| 1 | `DEMO_MODE` | Explicit switch for fixture mode in development and tests. Never set in production. |
| 1 | `<GCC_PROVIDER>_API_KEY` | Key for whichever GCC market-data provider you choose (Q2). |
| 1 | `SCHEDULER_SIGNING_KEY` | Only if an external scheduler is chosen (Q4). |
| 4 | `AUTH_SECRET` | Signs magic-link tokens and sessions. |
| 4 | `AUTH_EMAIL_FROM` | Sender for sign-in emails. |
| 4 | Analytics identifiers | Depend on the tool you choose (Q8). |
| 5 | `PAYMENT_PROVIDER`, `PAYMENT_SECRET_KEY`, `PAYMENT_WEBHOOK_SECRET`, `PAYMENT_PUBLIC_KEY` | Payment gateway (Q7). |
| 5 | `ADMIN_EMAILS` | Accounts allowed into the admin view. |
| 6 | `ALERT_WEBHOOK_URL` or `ALERT_EMAIL` | Where operational alerts go. |

Already defined and possibly unset in production (unverified): `RESEND_API_KEY`,
`RESEND_AUDIENCE_ID`, `NEWSLETTER_FROM`, `NEWSLETTER_SECRET`, `CONTACT_INBOX`,
`CONTACT_FROM`, `FRED_API_KEY`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`.

Business details (entity name, location, contact email, prices, sponsor names, partner
links) go in config files, not environment variables: `content/site.config.ts`,
`content/pricing.ts`, `content/sponsors.yaml`, `content/partners.yaml`.

### Schema migrations

| Phase | Change |
| --- | --- |
| 1 | `quotes`: add `delay_minutes`, `source`. `instruments`: correct `asset_class`, add `kind` (equity, index, fx, commodity, crypto). Start writing `recaps`, `macro_obs`, `fx_rates`, `calendar_events`. |
| 2 | `articles` and `clusters`: add `region`, `section`, `language`. `clusters`: add `base_score`, `published_at`, and use the existing `stale` status. `sources`: add `default_section`, `daily_cap`, `terms_checked_on`. New `shariah_screens` (symbol, standard, data date, ratios, status, inputs). New `disclosures` (symbol, exchange, title, URL, published time). |
| 4 | New `users`, `sessions`, `login_tokens`, `subscribers` (source of truth, mirrored to the email provider), `watchlists`, `watchlist_items`, `alerts`, `alert_deliveries`. |
| 5 | New `subscriptions`, `payment_events` (webhook idempotency), `saved_screens`, `sponsor_bookings`. |
| 6 | New `feed_health` (per-feed last success, last item time). |

All migrations are additive. No existing column is dropped, and `articles` keeps no body
column.

---

## 8. Conflicts with the standing rules in `CLAUDE.md`

The repository's `CLAUDE.md` contains rules written for earlier work. The new brief
contradicts several. I will not override them on my own; each needs a yes from you, and
I will then update `CLAUDE.md` in the same pull request so the rules and the work agree.

| Rule in `CLAUDE.md` | What the brief asks | My recommendation |
| --- | --- | --- |
| "No paid APIs, no paid SaaS, no metered AI in V1." | Real GCC data, payments, a reliable scheduler. | Lift it for named, approved services only, each with a stated monthly cost before purchase. |
| "Do not change the visual design" (colours, fonts, spacing, layout). | Phase 3 redesign; Phase 1 widget rebuilds. | Suspend for Phase 3 after you pick a palette. In Phases 1 and 2, allow new states and components built from existing tokens. |
| "Do not change navigation structure, page order, section order or the homepage layout." | New homepage order; non-finance sections capped to one row. | Lift for the homepage. Keep all existing URLs. |
| "Do not rewrite brand copy, taglines." | Phase 1 item 7 requires rewriting the tagline and meta description. | Lift for claims that are untrue today. Positioning stays "GCC and global market intelligence". |
| "The site renders useful content with zero keys (fixture mode)." | "Never display a fabricated number." | Keep fixture mode for development only, behind `DEMO_MODE`. |
| "At least about 30% of the live wire is deliberately non-financial." | Markets and economy lead. | Replace with a cap on non-finance content on the homepage. |
| Develop on the single branch `claude/wonderful-davinci-3fxwpg`. | "A feature branch per phase." | This session may only push to that branch. I will open one pull request per phase from it and restart it from `main` after each merge. |

---

## 9. Decisions needed from you

Each has my recommendation. Q1 to Q4 block Phase 1.

| # | Decision | Recommendation |
| --- | --- | --- |
| Q1 | Do you approve the rule changes in section 8? | Yes, as recommended. |
| Q2 | GCC market data: may I prepare a provider comparison (coverage of QSE, Tadawul, ADX, DFM; EOD or delayed; display licence; monthly cost) using trial keys? Is there a monthly budget ceiling? | Yes. Start with EOD data for the four exchanges, which is the cheapest honest option, and label it "EOD". |
| Q3 | Hosting: the site has been disabled twice for account or usage reasons, and Vercel's Hobby plan is for non-commercial use. Move to Pro before monetising? | Yes, before Phase 4 at the latest. It also removes the once-a-day cron limit. |
| Q4 | Scheduler: GitHub's cron is not keeping time. Options: Vercel Pro cron; a free external scheduler calling the existing `/api/cron/*` routes; or keep GitHub and accept runs every few hours. | Vercel Pro cron if Q3 is yes. Otherwise an external scheduler. |
| Q5 | Which Shariah screening standard should the Methodology page state? | AAOIFI Shariah Standard 21 thresholds, stated with the data date and the "not a fatwa" wording. I need your confirmation, and ideally a scholar's or adviser's review of the wording. |
| Q6 | Fundamentals for the Shariah ratios (debt, interest-bearing assets, non-compliant income) need a data source for GCC companies. Include this in the Q2 comparison? | Yes. Without it the screen cannot be computed and should stay hidden. |
| Q7 | Payment gateway. The business is in Qatar. I have not verified which gateways accept Qatar merchants today. | Let me verify, then choose between a merchant-of-record service (handles tax and invoicing) and a Gulf gateway. Decide in Phase 5. |
| Q8 | Analytics tool. | A cookieless, privacy-friendly tool so no consent banner is needed. Decide in Phase 4. |
| Q9 | Business details for config: legal or trading name, location, public contact email, editor biography, social links. | Needed for Phase 1 item 8. I will leave placeholders marked "to be supplied" and hide the fields until filled. |
| Q10 | Arabic-language sources: many GCC official sources publish Arabic first. May the pipeline write an English headline and summary from an Arabic source, clearly labelled as translated and linked to the original? | Yes, with a "translated from Arabic" label. |
| Q11 | Which keys are set in Vercel today (market data, KV, Resend, FRED)? I cannot see them. | Send the list of variable names that are set, not the values. |
| Q12 | The current Editor's pick (A9). | Remove it and require picks to expire after 72 hours. |
| Q13 | Is production database access available for a one-off read-only check of row counts and stale clusters during Phase 1? | Yes, read-only, through a script you run or a temporary credential. |

---

## 10. Risks

| Risk | Effect | Mitigation |
| --- | --- | --- |
| No affordable, licensable GCC price feed | GCC price surfaces stay empty | EOD first; honest empty states; decide with the Q2 comparison. |
| GCC sources forbid automated collection or have no feed | Fewer than 15 GCC stories a day | Assess terms source by source; prioritise official disclosure and regulator pages; report every skipped source. |
| Removing fixtures makes the site look emptier before real data arrives | Thinner pages for a short period | Ship Phase 1 data and the fixture removal together; well-designed empty states. |
| Shariah status shown without a sound method | Reputational and possibly regulatory harm | Hidden until rule-based, documented and dated. |
| Free-tier data used commercially | Breach of provider terms | Confirm commercial terms before sponsors or Pro launch. |
| Payment gateway does not accept Qatar merchants | Phase 5 delay | Verify before building; payments sit behind an interface. |
| Hosting disabled again | Site and all jobs down | Q3. |
| AI summaries of single-source or sensitive stories | Errors or defamation | Summaries only from stored facts; no summary for allegations about named people without a second source; "report an error" link stays. |
| Scope: six phases is a large build | Slow delivery | Strict phase gates; Phase 1 and 2 deliver the trust and content fixes before any redesign. |

---

## 11. What was not done in Phase 0

- No provider endpoint was called (no keys available here).
- Production environment variables and database were not inspected.
- GCC source terms and robots rules were not yet reviewed; that is the first task of
  Phase 2.
- Lighthouse was not re-run; this environment's network path inflates the timings.

---

## 12. Phase 1 status (truth and trust) — built, awaiting sign-off

Built on `claude/wonderful-davinci-3fxwpg`. How each finding was addressed:

| # | Finding | Fix |
| --- | --- | --- |
| 5 | Sample data under a "live" tagline | One quote service (`lib/market/service.ts`) with source, time and delay; Postgres is the last-known-good store; fixtures are reachable only under `DEMO_MODE=1` and a CI check enforces it. Tagline and description rewritten in `content/site.config.ts`. |
| 6 | Recap built on sample data | Built in the end-of-day job from real closing quotes, stored with its inputs, and not published below 80% coverage (`lib/narrative/session.ts`). |
| 7a | Heatmap | Server-rendered from real quotes; empty state otherwise. |
| 7b | Commodities and Crypto tabs | Every panel is in the HTML; rows are real (ECB reference rates, EIA energy benchmarks via FRED, CoinGecko) or an empty state. |
| 7c | Session clocks | Open and close shown in Doha time and the reader's time; Gulf venues listed first; UAE venues use a Monday to Friday week. |
| 7d | "Movers" twice | Inner heading removed. |
| 8a | Screener trend | Drawn only from stored daily closes; a dash otherwise. |
| 8b | Sign mismatch | One `ChangePill`; glyph, sign and colour come from one rounded number. |
| 8c | Sort and pagination | Server-side, through URL parameters. |
| 9 | Date mismatch | Banner is today's date in Doha; the recap carries its session date. |
| 11 | "CB" and ticker tags | Control is labelled "Colour-blind-safe colours" in the footer. Tickers match only in market context and are re-derived at read time; chips carry the company name. |
| 12 | Newsletter field | One visible field and one button. |
| 13 | About | Reads operator, editor and contact from `content/site.config.ts`. |
| 15 | Stock photos (first step) | Random `picsum` fallback removed; a story with no credited image shows the generated section cover. |
| A1, A2 | Economy and calendar | Economy reads stored FRED and World Bank observations with source and date. The calendar shows an empty state and its link is hidden until a source exists. |
| A3 | Shariah flags | Column and filter removed; methodology states that none is shown yet. |
| A5 | Job reliability (part) | Cron routes allowed 60 seconds; migrations applied on merge. The scheduler itself is unchanged pending Q3 and Q4. |
| A6, A7 | Counters, footer, disclaimer | Replaced with true counts and accurate statements. |
| A8 | Mobile overflow | Fixed and covered by a 380 px smoke test. |
| A9 | Editor's pick | Removed. Picks now need an exact slug and expire after 72 hours. |
| A10 | Quote delay lost on storage | `quotes.delay_minutes` added (migration 0005). |

Left for later phases as planned: GCC sources and the classifier (2), ranking decay at
read time (2), homepage duplicates and mix (2), the Shariah screen and GCC instruments
(2), cover system and palette (3).

Verification carried out: 212 unit tests, 9 smoke tests, 40 visual baselines, lint,
type-check, the fixture-import check and a production build. The production build
was run locally with no data (every surface showed its empty state, and a search of
the rendered pages for "sample" and "illustrative" found nothing) and against a
local Postgres populated through the real persistence functions.

**Not verified:** no provider was called from the build environment (its network
policy blocks them), so the FRED, Frankfurter and World Bank fetches are covered by
mocked tests only. The first macro and quotes job runs after deployment are the real
test; check the job output and the Markets and Economy pages after they run.

