# Backend, APIs & Vercel health — pre-launch

Date: 27 Nov 2026. Evidence: the repository at `cbf0009`, GitHub Actions run
history (public API) and the live site. **Not accessible from this session:**
Vercel dashboard, logs and environment variables, and the production database.
Rows that need those are marked *owner check*.

## 1. Pass/fail summary

| Check | Result | Evidence / note |
| --- | --- | --- |
| Build, type-check, lint, unit tests | **PASS** | CI `verify` green on every PR today; 409 tests |
| Fixture/demo data cannot reach production | **PASS** | `pnpm check:fixtures` in CI; demo helpers gated by `DEMO_MODE` |
| News ingestion running intraday | **PASS** | `pipeline.yml` runs every 30 min and restarts itself. Last runs: 12:15 success, 13:06 cancelled (handover to the next run), 17:16 in progress |
| Quotes refresh | **PASS** | `quotes.yml` success at 10:45, 10:53 and 11:51 UTC, plus the pipeline's 15-min US-session loop |
| Macro / FX / video refresh | **PASS (partial data)** | `macro.yml` success 07:46 UTC. FRED series are empty because `FRED_API_KEY` is not set in production |
| EOD / retention | **PASS** | `eod.yml` success 03:58 UTC; Vercel cron `0 22 * * *` (the only Vercel cron, as Hobby requires) |
| Daily briefing | **PASS** | `briefing.yml` success 26 Nov 13:29 UTC |
| Cron routes protected | **PASS** | `/api/cron/*` require `Authorization: Bearer $CRON_SECRET` (401 otherwise) |
| Cron plan limits | **PASS (by design)** | Hobby allows daily crons only, so intraday work runs from GitHub Actions calling protected routes, as the brief proposes |
| Function timeouts | **PASS** | `maxDuration = 60` on quotes/macro/eod; heavy ingest and cluster work runs in the Actions runner, not on Vercel |
| Ingest idempotency | **PASS** | Unique key on `articles.url` (`onConflictDoNothing`/`DoUpdate`) |
| One failing source doesn't stop the run | **PASS** | Per-source try/catch in the ingest job; failing cycles counted, with a stop after 3 |
| Provider calls cached with TTLs, behind `lib/providers/*` | **PASS** | Every fetcher uses `swr` with an explicit TTL; Zod at boundaries |
| Last-good-value with an "as of" stamp | **PASS** | Prices are read from the store with `asOf` and the source; the UI never prints a zero for missing data |
| Health endpoint | **FAIL** | `/api/health` → 404 |
| Freshness alarm and "Data delayed" banner | **FAIL** | None |
| Error tracking (Sentry or similar) | **FAIL** | Not present |
| Uptime monitor | **Unknown, owner check** | Nothing in the repository references one |
| Env vars present in Production *and* Preview | **Owner check** | Cannot read Vercel. Known gap: `FRED_API_KEY` missing in production |
| Homepage caching | **PASS** | Pages are dynamic (they read the currency cookie), so the homepage is never a stale build; data freshness comes from the store |
| Lighthouse mobile | **Not run** | `lighthouse.yml` exists but has never run; to run on the preview |
| Smoke test | **FAIL (missing)** | No `scripts/smoke.ts` yet |
| Newsletter end to end | **Owner check** | Needs a real inbox to confirm the double opt-in |

## 2. External dependency inventory

| Dependency | Used for | Env var | Plan / limit | On failure |
| --- | --- | --- | --- | --- |
| Finnhub | US equity and ETF quotes, profiles, search | `FINNHUB_API_KEY` | Free, ~60 calls/min | Last stored value with its stamp; card hidden if never stored |
| CoinGecko | Crypto | none | Public tier, ~30/min | Last stored value |
| Frankfurter (ECB) | FX reference rates, USD conversion | none | Free | Last stored fixing with its date |
| FRED (incl. EIA energy) | 10-yr yield, Brent, WTI, Henry Hub, US macro | `FRED_API_KEY` | Free key | **Not configured → empty states** |
| World Bank | Annual GCC macro | none | Free | Last stored |
| FMP / Polygon / EODHD / Alpha Vantage | Fallbacks, fundamentals, candles | `FMP_API_KEY`, `POLYGON_API_KEY`, `EODHD_API_KEY`, `ALPHAVANTAGE_API_KEY` | Free tiers | Skipped when unset (owner check which are set) |
| Groq | AI summaries and Mizaan Originals | `GROQ_API_KEY` | Free tier, daily token cap | Stops asking once the daily cap is hit; retries a story at most every 6 h |
| Pexels | Cover photos | `PEXELS_API_KEY` | Free | Branded SVG cover fallback |
| YouTube (oEmbed / Data API) | Official channel videos | `YOUTUBE_API_KEY` (optional) | Free | Card shows the channel without a thumbnail |
| TradingView widget | QSE prices (in the reader's browser) | none | Free embed | Widget box stays empty; attribution link remains |
| RSS feeds (46 active) | News | none | Per-source terms | Per-source error, run continues |
| Neon Postgres (Vercel) | All stored data | `POSTGRES_URL` | Free tier | Pages show empty states |
| Vercel KV / Upstash | Cache, flags | `KV_REST_API_*` / `UPSTASH_REDIS_REST_*` | Free tier | Falls back to the database or memory |
| Resend | Mizaan Morning newsletter, contact form | `RESEND_API_KEY`, `RESEND_AUDIENCE_ID`, `NEWSLETTER_*`, `CONTACT_*` | owner check | Signup returns an error message |
| Google Analytics / Microsoft Clarity | Analytics | `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_CLARITY_ID` | Free | No tracking (owner check that they are set) |

The **last successful fetch per source** is in the database (`sources.last_fetched_at`, `articles.fetched_at`, quote `fetched_at`, and the job-run log in `lib/jobs/job-runs.ts`). It will be exposed by the proposed `/api/health` detail view, since this session cannot query production.

## 3. Proposed fixes for the failures

1. **`/api/health`:**
   - Public view: `{ status, checkedAt }`.
   - Detail view (needs `Authorization: Bearer $CRON_SECRET`): database reachable, plus the newest `fetched_at` for news, `as_of` for equities, FX, crypto, energy and videos, each with its age in minutes and `ok | degraded | down` against its freshness limit.
   - Limits: news 60 min daytime; equities 30 min during the US session; FX 3 days; energy 4 days; video 24 h.
2. **"Data delayed" banner:** a small server-rendered strip when news or in-session quotes are past their limit.
3. **Alerting:** the pipeline already runs every 30 min, so it can call the detail health view and send an email through Resend (already used for the newsletter) when the status is `down` twice in a row. No new service is needed.
4. **Sentry and UptimeRobot (free tiers):** these need you to sign up. I'll wire Sentry behind `SENTRY_DSN` so it's off until the key exists.
5. **`scripts/smoke.ts`:** described in AUDIT.md P0 #8. Runs against any base URL, including the preview.

## 4. Rollback

The baseline production deployment for `cbf0009` is
`market-intelligence-2-0-aftnhuzjp-shakiljaved778-6784.vercel.app`. Use
Vercel → Deployments → that deployment → **Instant Rollback**. The code
baseline is the branch `baseline/pre-launch-2026-11-27`.
