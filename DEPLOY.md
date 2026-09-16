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
2. Optionally add **KV** the same way (adds `KV_REST_API_URL` / `KV_REST_API_TOKEN`).
3. Locally, run the one-time table setup:
   ```bash
   POSTGRES_URL="<paste from Vercel>" pnpm db:migrate
   ```

### 2b. Your market-data keys

In the Vercel project → **Settings → Environment Variables**, add the ones you have
(any subset — skip the rest):

| Variable | What it turns on |
|---|---|
| `FMP_API_KEY` | live stock quotes + profiles |
| `POLYGON_API_KEY` | price charts |
| `EODHD_API_KEY` | end-of-day history |
| `FRED_API_KEY` | economic data |
| `SEC_USER_AGENT` | e.g. `Mizan you@mizan.com` (for filings) |
| `NEXT_PUBLIC_SITE_URL` | `https://mizan.com` (or your Vercel URL) |
| `CRON_SECRET` | any long random string — protects the refresh jobs |

Redeploy (Vercel → **Deployments → Redeploy**) after adding them.

### 2c. Auto-refresh (optional)

To keep data fresh, the GitHub Actions in `.github/workflows/` call the site on a
schedule. In the **GitHub repo → Settings → Secrets and variables → Actions**, add:
`APP_URL` (your live URL), `CRON_SECRET` (same string as above), and — for the news
engine — `POSTGRES_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, and `EMBEDDER=minilm`.

They start running on their own once the secrets exist.

---

## TL;DR

- **Today:** import the repo on Vercel, click Deploy. Done — live site.
- **Whenever you're ready:** add a Postgres database and paste in whatever API keys
  you have. Each one you add lights up more live data; anything missing stays on
  sample data.
