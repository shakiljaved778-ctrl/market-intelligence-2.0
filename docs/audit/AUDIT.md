# Mizaan Intelligence — Pre-launch editorial & strategic audit

Date: 27 Nov 2026 (evening, Doha). Baseline: `main` @ `cbf0009`, frozen as branch
`baseline/pre-launch-2026-11-27`. Method: a crawl of 33 live URLs on
www.mizaan.tech (HTML as served, no JavaScript), a read of the codebase, and
spot checks of the issues listed in the brief. Every finding below was
reproduced on the live site or in the code unless it says otherwise.

---

## A. Market positioning

| Player | What they own | Where Mizaan can beat them |
| --- | --- | --- |
| Bloomberg, Reuters | Speed, licensed data, terminal depth, reporters | Free, open, Gulf-first framing; ranks what matters instead of publishing everything |
| FT | Authority, analysis, house style | No paywall; transparent ranking; GCC data in one place |
| Zawya (LSEG), Argaam | Deep GCC company and market data; Argaam is Arabic-first and Saudi-centric | Cross-GCC plus global in one view, with source and time on every number |
| Gulf Business, Arabian Business, AGBI, The National, Semafor Gulf | Original Gulf reporting and features | Aggregation plus signal: which stories matter, which instruments they move |
| Google News, Finviz | Breadth (Google), US market screens (Finviz) | Editorial judgement on Gulf relevance; official-source weighting; methodology in the open |

**Reader.** GCC professionals: bankers, investors, founders, policy and
government-relations people, and students in finance. They want a five-minute
morning read that says what moved the Gulf and the world, with numbers they
can trust and links to the primary source.

**What Mizaan can own:** *the most trustworthy free Gulf markets front page.*
That means ranked, sourced and timestamped, with official sources (central
banks, regulators, exchanges) put first. Over time an Arabic edition and a
Shariah screen would be hard for incumbents to copy at Mizaan's speed.

## B. Core proposition

**As it stands:** "News ranked by coverage and market moves, market data with
its source and time, AI summaries linked to original sources."

It is accurate and defensible, but it describes **how** the site works, not
**why** a reader should come back. It is felt on first load (the index board,
source stamps and ◆ scores are visible), but the ◆ score is unexplained, which
blunts it.

**Sharper:** *"What moved the Gulf and the world today — ranked, sourced and
timestamped, so you can trust every number."*

## C. Strengths (specific)

- **Methodology in the open:** a `/methodology` page explaining clustering and
  ranking, a separate `/ai-disclosure`, `/editorial-policy` and `/corrections`.
- **Source and time discipline:** every price carries a provider and time
  stamp ("Finnhub · 27 Nov, 22:20 AST"). FX says "ECB reference rate · daily
  fixing". The fixture/demo data is gated out of production by a CI check.
- **Official-source weighting:** regulators and primary sources get tier 1.0
  in ranking. 46 active sources, including central banks (RBI, RBNZ, BoE, Fed),
  the WTO, World Bank, NASA, WHO and QNA.
- **Deterministic clustering and ranking,** with AI used only for clearly
  labelled summaries ("AI-written · from N cited sources").
- **Legal hygiene:** no article bodies stored (guarded by a schema test),
  robots.txt checked inside the fetcher, a licence note per source.
- **Market hours per exchange time zone:** QSE and Tadawul use Asia/Qatar and
  Asia/Riyadh with a Fri–Sat weekend.
- **USD/QAR toggle,** rendered on the server from a cookie with no flash.
  Movers convert correctly ("QR 334.52"); see D for the gaps.
- **Accessibility basics:** the tickers' duplicate copies are `aria-hidden`
  and respect `prefers-reduced-motion`; prices show ▲/▼ and a sign, not colour
  alone.
- **Distribution plumbing already built:** `/feed.xml`, per-section feeds
  (`/feed/[section]`), a news sitemap, an OG image route, the Mizaan Morning
  newsletter with double opt-in, and ⌘K search.
- **A self-healing pipeline:** it ingests every 30 minutes, restarts itself, has
  a kill switch, and stops when the deployment is disabled.

## D. Shortcomings, ranked by launch damage

| # | Issue | Evidence | Severity |
| --- | --- | --- | --- |
| 1 | **A runaway cluster is the #1 story on the site.** A Bank of England "Statistical Notice" cluster has absorbed 13 unrelated reports (a Victorian election media piece, Andy Burnham in Brussels, …) and three tickers (GOOGL, META, NFLX). It shows "6 sources", ranks 78 and sits in Top stories. | `/news/statistical-notice-2026-09-update-to-the-classification-303db6` → "Sources · 14 reports" | **Critical.** Undermines the core "signal" claim on first load. Cause: single-link chaining in `lib/curation/cluster.ts`. |
| 2 | **QAR toggle is incomplete.** With QAR selected, the new index board and the ticker tape still print dollars (29 `$` figures on `/quote/AAPL`). | curl with `mi_ccy=QAR` | High: a visible broken promise on every page. |
| 3 | **Stale Eureka on the homepage**: items 105–108 days old. | Homepage Eureka row: "108d ago", "105d ago" | High: reads as abandoned. |
| 4 | **◆ score unexplained** on every card (59 on the homepage). | Crawl | Medium-high: looks like noise; it is our best trust signal. |
| 5 | **No health endpoint, no error tracking, no uptime monitor.** | `/api/health` → 404; no Sentry in the code | High for operations (see BACKEND_HEALTH.md). |
| 6 | **Miscategorisation:** an Amazon union story and other non-market items under Markets, because any ticker match falls back to Markets. | Homepage Markets row; `classifySection` fallback | Medium |
| 7 | **Text hygiene:** zero-width characters ("FIBA ​​Basketball"); no sanitiser at ingest. | `/news?section=sports` | Medium |
| 8 | **"Markets Markets" / "Economy Economy"** on `/sections`: the cover art's text and the card label are both read out. | `/sections` | Low-medium |
| 9 | **The same video shows twice on the homepage.** The between-story videos wrap around to channels the Watch strip already shows (the Fed). This is my own bug from today. | Homepage inline video #4 = Federal Reserve | Low-medium |
| 10 | **Trust copy gaps:** the AI model isn't named, ingestion cadence isn't published, ranking weights aren't published, and "no model in the loop" is imprecise (clustering uses locally computed embeddings). | `/methodology`, `/ai-disclosure` | Medium: easy to fix, high trust value |
| 11 | **Session recap totals:** "32 rose and 27 fell" of 60, with one unchanged name not shown. | Homepage recap | Low, but it's the kind of thing finance readers notice |
| 12 | **No GCC public-holiday calendar.** Qatar National Day (18 Dec) is three weeks away; QSE will show "Open". | `lib/format/session.ts`: "Public holidays are not modelled" | Medium (time-bound) |
| 13 | **No commodity prices** (Brent, WTI, Henry Hub). The code is wired to EIA data via FRED but `FRED_API_KEY` isn't set in production. | `/markets` Commodities tab shows an honest empty state | Medium. Fix is a free key (owner action). |
| 14 | **Heavy homepage HTML (931 KB).** | Crawl | Medium for mobile performance; needs a Lighthouse run |
| 15 | **Empty alt text on all card images** (68 on the homepage). Defensible for card thumbnails next to their headline link, but story-page hero images should describe the photo. | Crawl | Low-medium |

### Checked and NOT a bug (no change, per §2.3 / §1.8)

- **ANT / Anthropic:** `/quote/ANT` shows "Anthropic · ANT · NASDAQ" correctly.
- **GCC "Closed · weekend" on Fri/Sat:** correct. It uses each exchange's own time zone.
- **Ticker duplicates:** the second copy is already `aria-hidden`, and reduced motion is respected.
- **Crypto tab "empty":** it is populated (BTC, ETH, XRP …). Tabs are client-side, so a no-JavaScript crawler only sees the first (FX) panel.
- **QSE widget "no table":** TradingView's widget is drawn by JavaScript in the reader's browser; the owner confirmed it shows prices. A crawler sees only the frame. A `<noscript>` link-out will be added.
- **"Jack Clark video under IMF":** labels come from the verified channel ID (`content/videos.yaml`, `expect_titles`), never from position. The video is the newest upload on the IMF channel, most likely an IMF podcast episode. To verify by eye before changing anything.
- **Stray backtick around ⌘K:** not present in the live HTML.
- **Shariah screen:** `/methodology` already says plainly that no Shariah status is shown yet. The screener's line "will be added once its method is published" is honest; it can be softened if you prefer.
- **RBI stories "in GCC news":** they sit in the Global markets band. Region tagging is correct.

## E. Scorecard (1–10)

| Area | Score | Why |
| --- | --- | --- |
| Editorial quality | 6 | Good source mix and honest labelling, held back by the runaway cluster, stale Eureka and miscategorised items |
| Data quality | 7 | Every figure stamped and nothing invented; gaps are commodities, GCC prices and QAR on two components |
| Freshness | 7 | Pipeline every 30 min, quotes every 15 min in the US session; homepage freshness rules are incomplete |
| Design / layout | 7 | Coherent, image-led, bold headlines; the ◆ score is unexplained |
| Mobile | 6 | Not yet measured at 390px; the homepage HTML is heavy |
| Performance | 6 | Server-rendered, but 931 KB homepage HTML; Lighthouse not yet run |
| SEO | 7 | Sitemaps, news sitemap, feeds and OG route present; structured data not yet audited |
| Brand | 6 | Distinct wordmark and palette; tagline and proposition not yet sharp |
| Trust signals | 8 | Methodology, AI disclosure, corrections, source stamps; a few precise claims missing |
| Monetisation readiness | 3 | No ad slots, sponsor policy or paid tier; data licences not yet cleared for commercial display |

---

## Proposed P0 plan (before launch)

Estimates are working time. All P0 work is fixes to existing behaviour; new
features follow in P1 behind flags.

| # | Fix | Files (main) | Est. |
| --- | --- | --- | --- |
| 1 | Stop runaway clusters: a new member must also be close to the cluster's seed (or centroid), plus a size guard for weak links. Re-cluster, with a regression test using today's real headlines. | `lib/curation/cluster.ts` + test | 2 h |
| 2 | QAR on the index board and ticker tape | `lib/market/board.ts`, `components/market/IndexBoard.tsx`, `TickerTape.tsx` | 1 h |
| 3 | Homepage staleness: hide news older than 72 h and features older than 14 days from homepage rows; label evergreen Eureka pieces "Explainer" | `lib/news/homepage.ts` + test | 1 h |
| 4 | Text sanitiser (zero-width and control characters, " ,", double spaces, entities, quotes) at ingest and at read | `lib/curation/normalize.ts` + test | 1 h |
| 5 | Label ◆ as "Importance 78/100", with a tooltip and a Methodology link | `StoryCard.tsx`, `Wire.tsx` | 45 m |
| 6 | Classifier: negative keywords and no "any ticker → Markets" fallback for labour, culture and politics stories | `content/sections.yaml`, `lib/curation/section.ts` + test | 1.5 h |
| 7 | `/api/health` (public minimal plus protected detail) and a "Data delayed" banner when a pipeline is stale | new route + `lib/health.ts` | 2.5 h |
| 8 | `scripts/smoke.ts`: every route returns 200, no undefined/NaN/[object Object], minimum stories per section | new script | 1.5 h |
| 9 | Methodology and AI-disclosure copy: name the model (Groq-hosted `openai/gpt-oss-120b`, with fallbacks), publish the cadence and ranking weights, reword "no model in the loop" | `app/methodology`, `app/ai-disclosure` | 1 h |
| 10 | GCC holiday calendar for 2026–27 (Qatar National Day, Eid al-Fitr, Eid al-Adha, Saudi and UAE national days), with half-days | `lib/format/session.ts` + test | 1 h |
| 11 | Small fixes: inline videos never repeat the Watch strip; "Economy Economy"; recap shows the unchanged count (with a totals test); QSE widget `<noscript>` fallback | various | 1 h |

**Total P0: about 14 hours.** Realistic for one long day, but not if launch is
tomorrow morning. If time is short, do 1, 2, 3, 5, 9 and 11 first (about 6 h).

**Owner actions (no code):** add `FRED_API_KEY` (commodities and the 10-year
yield), sign up for free Sentry and UptimeRobot accounts if you want them, and
confirm the newsletter end-to-end with a real inbox.

### Where this brief conflicts with earlier owner decisions (please confirm)

1. **§7 "editorial serif for headlines":** today you chose solid bold sans
   headlines. I will keep bold sans unless you say otherwise.
2. **§1.2 tag and branch:** this session can only push to its own branch, so
   the tag push was refused (HTTP 403). I froze the baseline as the branch
   `baseline/pre-launch-2026-11-27` and created `prelaunch/hardening` from
   main. Work arrives there by pull request. Please add the git tag yourself if
   you want one: `git tag pre-launch-baseline-2026-11-27 cbf0009 && git push origin --tags`.
3. **§2.2 / §5 "TradingView widget":** already live today as the owner-approved
   QSE exception. Extending it to other GCC exchanges needs your say-so (CLAUDE.md).
4. **§4.6 "drop non-English items":** the QSE YouTube channel and some Gulf
   sources publish in Arabic. I will not drop those without your decision.
