# Deploying Mizan

There are two levels. **Level 1 gets you a live site in ~2 minutes with nothing to
configure.** Level 2 (optional, later) turns on live data. Do them in order.

---

## Level 1 — See it live (no keys, no database)

The whole site works in "fixture mode" — real pages, sample data. Perfect for a
first deploy and for sharing a link.

1. Go to **vercel.com** → sign in with GitHub.
2. Click **Add New… → Project**, pick the **`market-intelligence-2.0`** repo,
   click **Import**.
3. Leave every setting at its default. Click **Deploy**.

That's it. In ~2 minutes you have a live URL (e.g. `mizan.vercel.app`). Every page
renders. Nothing to pay for.

> If Vercel asks which branch, choose the one with the code. To make future
> pushes deploy automatically, merge the work into `main` first (I can do this —
> just ask).

---

## Level 2 — Turn on live data (optional, do it later)

Only when you want real prices/news instead of the sample data. Add things **one at
a time** — anything you skip just keeps using fixtures, nothing breaks.

### 2a. A database (for saved news + history)

1. In your Vercel project → **Storage** → **Create Database** → **Postgres** →
   accept defaults. Vercel adds `POSTGRES_URL` for you automatically.
2. Add **KV** the same way (adds `KV_REST_API_URL` / `KV_REST_API_TOKEN`). The news
   engine caches through KV — add it before turning on auto-refresh.
3. Locally, run the one-time table setup (the migration enables the `pgvector`
   extension the news clustering needs):
   ```bash
   POSTGRES_URL="<paste from Vercel>" pnpm db:migrate
   POSTGRES_URL="<paste from Vercel>" pnpm db:seed   # optional: loads the demo universe
   ```
   If `pgvector` isn't enabled automatically, run once in the Vercel Postgres SQL
   console: `CREATE EXTENSION IF NOT EXISTS vector;`

### 2b. Your market-data keys (these live in **Vercel**)

The quote/macro refresh runs as Vercel routes, so the provider keys go in the Vercel
project → **Settings → Environment Variables**. Add the ones you have (any subset —
skip the rest; each one lights up more live data, anything missing stays on fixtures):

| Variable | What it turns on |
|---|---|
| `FMP_API_KEY` | live stock quotes + profiles + search (free ~250/day) |
| `POLYGON_API_KEY` | price charts / aggregate candles (free ~5/min) |
| `EODHD_API_KEY` | end-of-day history + real-time fallback |
| `FINNHUB_API_KEY` | optional — extra quotes/profiles |
| `FRED_API_KEY` | US economic data (free) |
| `SEC_USER_AGENT` | e.g. `Mizan you@mizan.com` (required by SEC EDGAR) |
| `NEXT_PUBLIC_SITE_URL` | your live URL (`https://…`) — fixes OG images + canonical |
| `CRON_SECRET` | any long random string — protects the refresh jobs |

> Free-tier discipline (§2): every provider above is used on its **free tier** and
> every response is **cached in KV** so pages never re-hit a vendor. Keep them on the
> free plans; don't upgrade a key to a metered/billed tier.

Redeploy (Vercel → **Deployments → Redeploy**) after adding them.

### 2c. Auto-refresh (these secrets live in **GitHub**)

To keep data fresh, the GitHub Actions in `.github/workflows/` call the site on a
schedule (`quotes` every 5 min, `ingest` every 10, `cluster` every 20, `macro` every
6 h, `eod` daily). In the **GitHub repo → Settings → Secrets and variables →
Actions**, add:

| Secret | Used by |
|---|---|
| `APP_URL` | all — the live URL the jobs call (`https://…`) |
| `CRON_SECRET` | all — must match the value you set in Vercel |
| `POSTGRES_URL` | `ingest`, `cluster` — write news clusters directly |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | `ingest`, `cluster` — cache |
| `EMBEDDER` = `minilm` | `cluster` — better paraphrase matching in the runner |

They start running on their own once the secrets exist (or trigger one manually from
the repo's **Actions** tab → pick a workflow → **Run workflow**).

### Go-live order (quick reference)

1. Level 1 deploy (repo → Vercel → Deploy).
2. Vercel: create **Postgres** + **KV** storage.
3. Locally: `pnpm db:migrate` (then optionally `pnpm db:seed`).
4. Vercel: paste provider keys + `CRON_SECRET` + `NEXT_PUBLIC_SITE_URL`, redeploy.
5. GitHub: add the Actions secrets above; run `quotes` + `ingest` once to verify.
6. Check the live site — quotes and the wire now show live data, cards say the real
   provider instead of "fixture".

---

## TL;DR

- **Today:** import the repo on Vercel, click Deploy. Done — live site.
- **Whenever you're ready:** add a Postgres database and paste in whatever API keys
  you have. Each one you add lights up more live data; anything missing stays on
  sample data.
