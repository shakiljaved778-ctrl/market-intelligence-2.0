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
| `/api/health` = ok; pipelines within limits | **After deploy** | Check `https://www.mizaan.tech/api/health` once merged |
| Crons firing (last 3 runs) | **Done** | pipeline 12:15 ✓, 13:06 (handover), 17:16 running; quotes 10:45 ✓ 10:53 ✓ 11:51 ✓; macro 07:46 ✓; eod 03:58 ✓ |
| Smoke test green on preview | **Pending** | Run on the PR's preview URL |
| Mobile walkthrough at 390 px | **Partial** | Cards checked at 390 px; full walkthrough on preview |
| No fake or placeholder data | **Done** | CI fixture guard; demo data only under `DEMO_MODE` |
| Rollback plan | **Done** | Vercel → Deployments → `market-intelligence-2-0-aftnhuzjp…` → Instant Rollback |
| Code freeze 12 h before announcement | **Owner** | Only P0 hotfixes after the freeze |
| 48 h post-launch watch | **Owner + Claude** | Health endpoint, CI-failure monitor (already scheduled), Vercel logs |
| Lighthouse mobile ≥ 80 | **Not run** | Run on preview (`lighthouse.yml` or PageSpeed Insights) |
| Newsletter signup end to end | **Done** | Owner tested with a real inbox (27 Nov) |
| `FRED_API_KEY` in production | **Done** | Added in Vercel (27 Nov); data arrives with the next macro run |

## Not in P0 (P1, behind flags)

The brief's new sections (PE / IB / VC), the commodities and crypto upgrades,
brand proposals, OG images, the video facade and the editorial style guide.
