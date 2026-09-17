/**
 * Symbols refreshed by the scheduled quotes job (§6 budget discipline): quotes
 * are fetched in batches on a schedule, written to cache + Postgres, and served
 * from cache. Page requests never trigger vendor calls. Kept small in V1;
 * sourced from the `instruments` table once populated.
 */
export const TRACKED_SYMBOLS: readonly string[] = [
  "AAPL",
  "MSFT",
  "NVDA",
  "GOOGL",
  "AMZN",
  "META",
  "TSLA",
  "AMD",
  "NFLX",
  "JPM",
  "BAC",
  "GS",
  "XOM",
  "WMT",
  "DIS",
  "KO",
  "BTC",
];

/** FRED series refreshed by the macro job. */
export const TRACKED_MACRO_SERIES: readonly string[] = ["CPIAUCSL", "UNRATE", "DGS10"];
