# Launch readiness — go / no-go (P0)

Updated 27 Nov 2026, evening (Doha). Branch flow:
`claude/wonderful-davinci-3fxwpg` → PR #109 → `prelaunch/hardening` → PR → `main`.

## P0 fixes shipped to `prelaunch/hardening` (PR #109)

| # | Fix | Commit | Verified by |
| --- | --- | --- | --- |
| 1 | Runaway clusters (unrelated reports chaining into the #1 story) | `f67a434` | Regression test on the 13 real headlines: fails before, passes after; existing same-event merges unchanged |
| 2 | USD/QAR on the index board and ticker tape | `0dd9bfa` | Demo mode with QAR on: 0 dollar figures, 37 QR figures on the homepage |
| 3 | Evergreen Eureka cards say "Explainer", not "108d ago" | `d591293` | Unit test |
| 4 | Text sanitiser (zero-width / control characters, entities, spacing) at ingest and read | `9354953` | Unit tests incl. the real "FIBA ​​Basketball" case |
| 5 | ◆ score labelled "Importance N/100" | `5e691f5` | Screenshot at 390 px |
| 6 | A ticker alone no longer files a story under Markets; inter-government talks go to World | `02ad706` | Tests on the real misfiled headlines; real market stories stay in Markets |
| 7 | `/api/health` (public + protected detail) and a "Data delayed" banner | `b9626b8` | Unit tests; local run returns `down`/503 with no database |
| 8 | `pnpm smoke [url] [--browser]` | `d2eb1c5` | Run against production (below) |
| 9 | Trust copy: model named, ranking weights and update schedule published, precise "no generative model" wording | `5526d03` | Copy checked against `lib/curation/rank.ts` and the workflows |
| 10 | Exchange holidays and early closes | `cfa1506` | Unit tests (Christmas, day after Thanksgiving 13:00 ET, UAE National Day) |
| 11 | Small fixes: videos never repeat the Watch strip, no "Economy Economy", recap counts add up, QSE `<noscript>` | `391b61f`, `4e39ed4`, `41c90cd`, `57714f5` | Unit tests |

All gates pass on the branch: lint, `tsc --noEmit`, 427 unit tests, `check:fixtures`,
Prettier and the production build.

## Smoke test against production (before this release)

`pnpm smoke https://www.mizaan.tech --browser`: **36 of 38 pass.**
- `/api/health`: not deployed yet (ships in this release).
- `/news?section=crypto`: only 2 stories. A content gap, not a defect.
  The page renders correctly; the Crypto section needs more sources (P1).

## Go / no-go checklist

| Item | State | Note |
| --- | --- | --- |
| Baseline preserved; nothing reverted | **Done** | Branch `baseline/pre-launch-2026-11-27` = `main` @ `cbf0009`. The git tag could not be pushed from this session (403); owner command in AUDIT.md |
| All work on a branch; merged only after checks | **Done** | PR #109 into `prelaunch/hardening` |
| `/api/health` = ok; pipelines within limits | **Done** | 27 Nov 22:02 UTC: `ok`, no issues, 0.2–1 s (after hotfixes #111/#113) |
| Crons firing (last 3 runs) | **Done** | pipeline 12:15 ✓, 13:06 (handover), 17:16 running; quotes 10:45 ✓ 10:53 ✓ 11:51 ✓; macro 07:46 ✓; eod 03:58 ✓ |
| Smoke test green | **Done (production)** | 37/38 after release; the one failure is the thin Crypto section (2 stories), a content gap. Preview URLs are unreachable from the build session |
| Mobile walkthrough at 390 px | **Done** | Five pages at 390/768/1440 px (docs/audit/ux/); no sideways scroll at 360–1440 px |
| No fake or placeholder data | **Done** | CI fixture guard; demo data only under `DEMO_MODE` |
| Rollback plan | **Done** | Vercel → Deployments → `market-intelligence-2-0-aftnhuzjp…` → Instant Rollback |
| Code freeze 12 h before announcement | **Owner** | Only P0 hotfixes after the freeze |
| 48 h post-launch watch | **Owner + Claude** | Health endpoint, CI-failure monitor (already scheduled), Vercel logs |
| Lighthouse mobile ≥ 80 | **Done** | Production 27 Nov 23:34 UTC: performance 84–90+ on all six pages, accessibility ≥ 95 everywhere (docs/audit/UX.md) |
| Newsletter signup end to end | **Done** | Owner tested with a real inbox (27 Nov) |
| `FRED_API_KEY` in production | **Done** | Added in Vercel (27 Nov); data arrives with the next macro run |

## Not in P0 (P1, behind flags)

The brief's new sections (PE / IB / VC), the commodities and crypto upgrades,
brand proposals, OG images, the video facade and the editorial style guide.

## Master brief coverage (checked 28 Nov 2026)

Every section of the pre-launch brief, item by item. "Flag" means built and
switched off until the owner turns it on in Vercel.

| Brief | Item | State |
| --- | --- | --- |
| §1 | Snapshot, baseline, branch, atomic commits, nothing reverted | Done (tag push blocked; baseline branch instead) |
| §2 | AUDIT.md, every §2.2 issue checked | Done; all real issues fixed |
| §2.2 | Heatmap "as of" per tile, stale tiles flagged | Done 28 Nov (faded tile with its date) |
| §2.2 | Heatmap sectors at least five names | Done 28 Nov (Utilities and Real Estate not tracked, so not shown) |
| §3 | BACKEND_HEALTH.md, `/api/health`, delay banner, smoke test | Done |
| §3.3 | Fetcher resilience; one structured summary per ingest run | Done 28 Nov |
| §3.3 | Quotes refresh every tracked symbol (bug found 28 Nov: the end of the list was days old) | Fixed 28 Nov |
| §3.4 | Freshness alert email | Done (needs Vercel KV for cross-instance state) |
| §3.4 | Error tracking (Sentry) | **Owner**: needs a free Sentry account and DSN |
| §3.4 | Uptime monitor | **Owner**: UptimeRobot on `/` and `/api/health` |
| §4.3 | AI summaries: numbers must match the source | Done (existing `ungroundedFigures` guard) |
| §4.4 | Homepage variety (source and section caps at the top) | Done 28 Nov |
| §4.5 | Section freshness: "More from …" when fewer than six fresh | Done 28 Nov |
| §4.6 | Drop sponsored and too-short items | Done 28 Nov; non-English items kept (owner decision pending, AUDIT.md) |
| §5 | Commodities (EIA via FRED), crypto (CoinGecko), gold | Done |
| §5 | Global indices | Done via country funds: US, Japan, UK, India, Germany, Hong Kong, dollar, gold |
| §5 | GCC indices | TradingView QSE widget (owner-approved); licensed feed is roadmap #2 |
| §5 | GCC pegs card | Flag `NEXT_PUBLIC_FLAG_GCC_PEGS` |
| §5 | Sparklines on movers | Done 28 Nov (stored history only; index funds have none yet) |
| §5 | Earnings and IPO calendar | Flag `NEXT_PUBLIC_FLAG_CALENDAR` (Finnhub; economic calendar needs a licensed source) |
| §6 | PE / IB / VC sections and Deals trackers, nav v2 | Flags `NEXT_PUBLIC_FLAG_DEALS`, `NEXT_PUBLIC_FLAG_NAV_V2` |
| §6.4 | Gulf sports; Sports Business | Done (Sports Business is a topic filter) |
| §7 | UX.md, screenshots, Lighthouse, video facade, accessibility | Done; mobile performance 82–90, LCP 3.5–4.8 s (homepage weakest) |
| §7 | Stock cover photos have empty alt | Intentional: illustrative stock images, not photos of the event |
| §8 | Brand proposals and preview page | Done; logo and tagline unchanged (owner) |
| §9 | STYLE_GUIDE.md; SEO (sitemaps, news sitemap, JSON-LD, RSS per section) | Done |
| §9 | Chart of the Day | Flag `NEXT_PUBLIC_FLAG_CHART_OF_DAY` |
| §9 | Mizaan Brief (newsletter), US close recap | Done (existing) |
| §9 | Week in Deals, Gulf Markets Close, event hubs, human-reviewed explainers | Roadmap: need Deals switched on, a licensed GCC feed, or an editor |
| §10 | Go/no-go table, rollback plan | Done (above) |
| §11 | Roadmap ranked by impact and effort | ROADMAP.md; "Why this story is ranked here" shipped |
