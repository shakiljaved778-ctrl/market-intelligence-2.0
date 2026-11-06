# Data licences & attribution (Phase 9 §7)

A record of every data source, the plan we use, what we call, and the attribution
we show. **Commercial-display rights are NOT assumed** — each row that matters for
ads / a paid tier is marked `[CHECK ON PROVIDER SITE]` and must be confirmed against
the provider's current terms before monetising (Phase 10).

> We display headlines + deks (≤40 words) + source name + link only, our own computed
> figures/prose, and full use of primary sources — never third-party article bodies (§10).

| Provider | Used for | Plan | Endpoints (via `lib/providers/*`) | Attribution shown | Commercial display |
|---|---|---|---|---|---|
| **Finnhub** | quotes, profiles, search | Free | `/quote`, `/stock/profile2`, `/search` | "Source: Finnhub" + delay stamp per price | `[CHECK ON PROVIDER SITE]` |
| **FMP** | fundamentals, fallback quotes | Free | quote/profile/fundamentals | provider stamp per value | `[CHECK ON PROVIDER SITE]` |
| **Polygon** | candles, EOD quotes | Free | aggregates | provider stamp | `[CHECK ON PROVIDER SITE]` |
| **EODHD** | EOD candle backfill | Free | EOD | provider stamp | `[CHECK ON PROVIDER SITE]` |
| **AlphaVantage** | last-resort fallback | Free | quote/daily | provider stamp | `[CHECK ON PROVIDER SITE]` |
| **CoinGecko** | crypto quotes | Free (keyless) | simple price | provider stamp | `[CHECK ON PROVIDER SITE]` — attribution usually required |
| **Frankfurter** | FX (USD conversion) | Free, ECB data | latest rates | n/a (internal) | ECB data, public |
| **FRED** (St. Louis Fed) | US macro series | Free | series/observations | "Source: FRED" on `/economy` | Public domain (US gov) |
| **World Bank** | macro indicators | Free | indicators API | "World Bank" | CC BY 4.0 — attribution required |
| **Pexels** | cover photos | Free | search | photographer + "/ Pexels" credit on each image | Free to use; keep the credit |
| **Groq** | AI summaries | Free tier | chat completions | labelled "AI-written" + disclosure | own output; `[CHECK]` rate/commercial terms |
| **RSS feeds** (`content/sources.yaml`) | news headlines/deks | per-source | feed URLs, robots-checked | source name + link per item | per each `license_note`; `[CHECK]` outlets left `active:false` |

## Before monetising (Phase 10)
- Confirm each **market-data** provider permits **commercial display** on a free key — several
  free tiers are "personal / non-commercial". Upgrade or switch where required (never a
  metered/billed tier without a deliberate decision — §2).
- Keep **CoinGecko**, **World Bank** and **Pexels** attribution visible.
- News: only ingest sources listed in `content/sources.yaml` with an explicit `license_note`;
  commercial outlets stay `active: false` until feed + terms are verified.

## Scanned, no secrets in client bundle
- No `NEXT_PUBLIC_*` variable holds a provider key (Phase 0 audit); all keys are read
  server-side only. `.env.example` lists every variable name.
- Git-history secret scan: run `gitleaks detect` (or GitHub secret scanning) in CI; this repo
  has no committed secrets to date. `[CHECK: run gitleaks once before launch.]`
