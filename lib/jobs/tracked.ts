/**
 * Symbols refreshed by the scheduled jobs (§6 budget discipline): quotes are
 * fetched in batches on a schedule, written to cache + Postgres, and served from
 * cache. Page requests never trigger vendor calls.
 *
 * Free-tier sizing (why this list is ~55 and not the whole 108-name universe):
 * the quotes job runs every 5 min (`quotes.yml`) and loops these sequentially.
 * The provider that actually sustains that cadence on a free tier is **Finnhub**
 * (60 calls/min); FMP (250/day) is exhausted in a few runs, so for intraday
 * refresh set `FINNHUB_API_KEY`. Crypto resolves via CoinGecko (keyless, 30/min).
 * We keep the equities/ADRs count comfortably under Finnhub's 60/min ceiling so a
 * whole run finishes inside one minute with headroom. Names Finnhub's free tier
 * doesn't cover (LSE `.L`, Qatar QSE) are deliberately NOT tracked — they'd burn
 * a call to return nothing — and stay clearly labelled as sample in the UI.
 *
 * Every symbol here is US-listed (NYSE/NASDAQ) or a US-listed ADR, plus the major
 * crypto. The full instrument universe still renders (fixtures, honestly marked);
 * this list is just which names carry *live* cached prices.
 */
export const TRACKED_SYMBOLS: readonly string[] = [
  // Mega-cap tech / communication services
  "AAPL",
  "MSFT",
  "NVDA",
  "GOOGL",
  "AMZN",
  "META",
  "AVGO",
  "ORCL",
  "ADBE",
  "CRM",
  "AMD",
  "INTC",
  "QCOM",
  "CSCO",
  "NFLX",
  "PLTR",
  // Financials
  "JPM",
  "BAC",
  "WFC",
  "GS",
  "MS",
  "V",
  "MA",
  "BLK",
  // Health care
  "UNH",
  "LLY",
  "JNJ",
  "PFE",
  "ABBV",
  // Consumer
  "WMT",
  "COST",
  "HD",
  "MCD",
  "KO",
  "PG",
  "DIS",
  "NKE",
  "TSLA",
  // Energy / industrials / materials
  "XOM",
  "CVX",
  "BA",
  "CAT",
  "GE",
  // US-listed ADRs (Finnhub free covers these)
  "TSM",
  "ASML",
  "BABA",
  "TM",
  "SONY",
  "NVO",
  // Crypto (CoinGecko, keyless)
  "BTC",
  "ETH",
  "SOL",
  "XRP",
  "ADA",
  "DOGE",
];

/**
 * Core symbols whose real daily candles are backfilled by the once-daily EOD job
 * (`eod.yml`). Kept deliberately smaller than the live-quote list: candle
 * providers have much tighter free tiers than quotes (Polygon ~5/min, EODHD
 * ~100/day), and this job fetches `count × BACKFILL_RANGES` series. Symbols not
 * listed here still render price charts from fixtures (honestly labelled) — we
 * spend the scarce candle budget on the most-viewed names.
 */
export const BACKFILL_SYMBOLS: readonly string[] = [
  "AAPL",
  "MSFT",
  "NVDA",
  "GOOGL",
  "AMZN",
  "META",
  "TSLA",
  "AMD",
  "JPM",
  "GS",
  "V",
  "UNH",
  "LLY",
  "WMT",
  "XOM",
  "DIS",
];

/** FRED series refreshed by the macro job. */
export const TRACKED_MACRO_SERIES: readonly string[] = ["CPIAUCSL", "UNRATE", "DGS10"];
