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
| 2 | News feed quality | ✅ done | `claude/wonderful-davinci-3fxwpg` | Classifier fix + 20 tests; quality gate, Jaccard dedupe, freshness modules (+tests); generic world headlines reworded |
| 3 | Technical SEO | ✅ done | `claude/wonderful-davinci-3fxwpg` | Per-route titles/canonicals, JSON-LD (+test), sitemap index+4 children, robots, clean section routes, per-slug OG, per-section RSS |
| 4 | Google News / E-E-A-T | ✅ done | `claude/wonderful-davinci-3fxwpg` | news-sitemap, author entity + page, byline + AST dates, trust pages, corrections, contact form, Org/Person schema |
| 5 | Programmatic GCC stock pages | ✅ done | `claude/wonderful-davinci-3fxwpg` | QSE master list (20), exchange hubs, GCC company pages (profile/peers/coverage, price+index only with real data) |
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

## Phase 2 — what was built (news feed quality)

- **Classifier fix** (`content/sections.yaml`): moved `space launch`/`satellite` out of
  `technology` into `science` (+ `space agency`, `spacecraft`, `rocket launch`, `asteroid`,
  `astronomy`) so space-agency stories go to Science, and added index names
  (`ftse`, `dow jones`, `nikkei`, `dax`, `hang seng`) to Markets. **20 labelled test
  cases** in `section.test.ts` lock it in (covering the cited FTSE→Markets, NASA→Science bugs).
- **Quality gate** (`lib/curation/quality.ts` + tests): headline must name a specific
  entity/number; raw institutional titles ("Minutes of the Meeting…", "Monetary policy
  decisions") are flagged for rewrite; summaries must be ≥40 words with every number
  present in a cited source. **Wired into `ingestAll`** (live) — seed-style headlines are
  dropped, institutional titles kept for rewrite, every drop logged.
- **Near-duplicate guard** (`lib/curation/dedupe.ts` + tests): same-section, 72h, title
  token Jaccard. **Wired into the live wire read** (`lib/news/read.ts` →
  `collapseNearDuplicates`) so a paraphrase never shows twice; curated fixtures exempt.
- **Freshness windows** (`lib/curation/freshness.ts` + tests): Markets/Econ/Crypto 48h,
  World/Tech/RE 72h, Science/Health 7d, Eureka evergreen (no age stamp).
- **Fixture cleanup**: the three generic "world" headlines ("Leaders gather…", "Historic
  peace deal…", "Voters head to the polls…") reworded to name concrete entities
  (G20 summit, UN ceasefire, election with 70% turnout); all still classify to `world`.
- Verified: `tsc`, `eslint`, `prettier` clean; **138 unit tests pass**; `visual:compare`
  → **36/36** (headline rewording is content, under the 0.5% threshold — no design change).

### Deferred from Phase 2 (reported, not silently skipped)
- **Institutional-title *rewriting*** (§4): the detector is built & wired; the actual
  rewrite into a factual headline needs the Groq summariser (runs only with a key).
- **Freshness *wiring*** at the homepage/section-front rendering layer: the module is
  built & tested but not yet applied to the read, because applying it globally dropped a
  legitimately-old live story in the merge test and would churn the fixture baseline.
  Apply it in the homepage/section-front selection in live mode.
- **Hero rule** (§7: lead needs 3+ sources & <24h) — not wired this pass (would change the
  fixture lead / baseline); build as a `pickHero` helper applied in live mode.
- **Real resolving source URLs / 7-day pipeline replay** (§1, §8): need live feeds + keys;
  fixtures keep `*.example` URLs as the labelled demo fallback (same call as Phase 1).

## Phase 3 — what was built (technical SEO)

- **`lib/seo.ts`** (+ `seo.test.ts`, 7 tests): `canonical()`, `ogImage()`, `pageMeta()`
  and the JSON-LD builders (Organization, WebSite+SearchAction, NewsArticle, BreadcrumbList,
  Corporation, graph). One source of truth, unit-tested.
- **Titles**: template `%s | Mizaan`; home `Mizaan Intelligence — GCC & Global Market News…`;
  unique title + description + canonical on markets, economy, calendar, screener, news,
  sections, methodology, about, home.
- **Quote pages**: `[Name] ([SYMBOL]) Share Price Today, News & Chart | Mizaan`, description,
  canonical, per-symbol OG, BreadcrumbList + Corporation (tickerSymbol) JSON-LD.
- **Article pages**: canonical, per-slug OG, NewsArticle (publisher logo, `isBasedOn` sources,
  image) + BreadcrumbList JSON-LD.
- **Clean section routes** `/news/section/[section]` (reuse the News page, identical render);
  `/news?section=x` canonicalises to them.
- **Sitemap index** at `/sitemap.xml` → children `/sitemaps/{pages,news-articles,quotes,recaps}.xml`
  (plain route handlers — Next's `generateSitemaps` 404s its index; quotes = resolvable only;
  ready to split past 45k URLs). Verified serving valid XML.
- **robots.txt**: allow `/` + `/api/og`; disallow `/api/`, `/search`, `/preview`; Host + sitemap.
- **RSS**: `/feed.xml` (latest 50) + `/feed/[section]` per vertical (`lib/rss.ts` shared),
  with `<link rel=alternate>` on section pages.
- **IndexNow** (`lib/indexnow.ts`): env-gated `pingIndexNow()` helper (no-op without key).
- Verified: `tsc`, `eslint`, `prettier` clean; **145 unit tests**; `visual:compare` **36/36**
  (all SEO is in `<head>`/routes — zero design change); live curl of robots, sitemap index,
  child sitemaps, per-section RSS, quote JSON-LD and clean section route all correct.

### Deferred from Phase 3 (reported, not silently skipped)
- **IndexNow activation**: helper built; hosting the `<key>.txt` verification file and
  calling `pingIndexNow` on publish is a live-mode wiring (needs `INDEXNOW_KEY` + the jobs).
- **410 for removed articles**: no "removed" store exists yet; 404 is correct until one does.
- **noindex on search/pagination**: no user-facing search-results route or paginated route
  exists (search is a modal over `/api/market/search`, already disallowed), so nothing to tag.

## Phase 4 — what was built (Google News / E-E-A-T)

- **Author entity** (`lib/author.ts`): Shakil Javed, Founder & Editor, `editor@mizaan.tech`.
  Bio + LinkedIn left as `[CHECK]` placeholders (owner inputs blank).
- **`/author/shakil-javed`**: bio, contact, latest stories, **Person JSON-LD**.
- **Article byline** (existing meta style): "Edited by Shakil Javed · AI-assisted summary
  from N cited sources · <published> AST", linked to the author page; NewsArticle now
  lists the editor as author/editor and the page emits the Person entity.
- **Visible dates**: published time in **Asia/Qatar (AST)** via `lib/format/datetime.ts`.
- **"Report an error"** link on every article → `/corrections?url=<article>`.
- **Trust pages** (Prose template, linked as plain footer links): `/editorial-policy`,
  `/ai-disclosure`, `/corrections` (report flow + log, `lib/corrections.ts`), `/contact`
  (email + native form → `lib/contact.ts` Resend-REST sender, honeypot, env-gated).
- **Google News sitemap** `/news-sitemap.xml` (last 48h, `news:` namespace, ≤1000),
  referenced from robots.txt; new pages added to the main sitemap.
- **Organization schema** gains `publishingPrinciples`, `correctionsPolicy`, `contactPoint`,
  `email` (`lib/seo.ts`).
- Verified: `tsc`, `eslint`, `prettier` clean; **145 unit tests**; live curl of all new
  pages (200), news-sitemap XML, and the article byline/Person schema; `visual:compare`
  **36/36** after re-baselining the footer-links + article-byline additions (approved).

### Owner inputs still needed (marked `[CHECK]` in code)
- Editor **bio** (`lib/author.ts`) and **LinkedIn URL** (also feeds Person `sameAs`).
- Contact-form delivery: `RESEND_API_KEY` + `CONTACT_INBOX` + a verified `CONTACT_FROM`
  (until set, the form says "email us directly"). `editor@mizaan.tech` is the public address.

### Deferred from Phase 4 (reported)
- **Corrections DB table**: the log reads a committed (empty) list; wire the `corrections`
  table in live mode. Rendering + report flow already work.

## Phase 5 — what was built (programmatic GCC stock pages)

- **Company master list** (`content/gcc-companies.ts`): the 4 GCC exchanges + a seed
  roster of **20 well-known QSE constituents** (symbol, name_en, sector — verified public
  data). nameAr/ISIN/website/profile left `[CHECK]` (not invented). Tadawul/ADX/DFM rosters
  are structurally ready, empty pending verified data.
- **GCC company pages** (`components/market/GccCompanyView.tsx`, routed from the existing
  `/quote/[symbol]`): breadcrumbs (Home > Markets > [Exchange] > [Name]), H1 "[Name] share
  price", profile, sector peers, related coverage. **Title** "[Name] ([SYMBOL]) Share Price
  Today | [Exchange] | Mizaan". The **price block + indexing appear only with a REAL quote**
  (provider ≠ fixture) AND a profile or related story — otherwise a "pricing pending" state
  and `noindex`. Never an invented price (the QSE fixtures in the universe are ignored here).
  Corporation + BreadcrumbList JSON-LD. Non-GCC symbols (e.g. AAPL) are untouched.
- **Exchange hubs** `/markets/{qse,tadawul,adx,dfm}` — company tables linking to the pages;
  plain links added to the Markets page; added to the sitemap (hubs indexable).
- Verified: `tsc`, `eslint`, `prettier` clean; **145 unit tests**; `visual:compare` **36/36**
  (only the Markets exchange-links row re-baselined; `/quote/AAPL` byte-identical); live curl
  confirmed QNBK title/H1/pending/noindex, the QSE hub, and AAPL unchanged.

### Deferred / needs owner data (Phase 5)
- **Real GCC prices**: need a provider that returns QSE/Tadawul/ADX/DFM EOD (none configured);
  pages light up and become indexable the moment one writes `market:quote:<SYMBOL>` to cache.
- **Company profiles, Arabic names, ISINs, upcoming events, full P/E & dividend blocks** —
  `[CHECK]` for the owner to supply (no invented facts). ISR cadence (15 min / 24h) applies
  once real data flows.
- Note: QSE fixtures already in the universe still show as *labelled samples* in Movers/screener
  (pre-existing Phase 1 behaviour) — the dedicated GCC pages correctly hide that fixture price.

### Decisions & open items
- **Branch strategy: decided** — all phases commit to the single branch
  `claude/wonderful-davinci-3fxwpg` (owner chose one rolling branch over `fix/NN-*`).
- **Live-data sequencing (open)**: Phases 1, 2 and 5 can only show *real* numbers once
  Finnhub/FRED/KV/Postgres keys exist (DEPLOY.md). Until then they build the
  validation/dedup/hide-when-empty machinery, not live values.
