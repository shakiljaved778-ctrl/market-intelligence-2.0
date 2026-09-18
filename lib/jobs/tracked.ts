/**
 * Symbols refreshed by the scheduled quotes job (§6 budget discipline): quotes
 * are fetched in batches on a schedule, written to cache + Postgres, and served
 * from cache. Page requests never trigger vendor calls. Kept small in V1;
 * sourced from the `instruments` table once populated.
 */
export const TRACKED_SYMBOLS: readonly string[] = [
  // Mega-cap tech / comms
  "AAPL",
  "MSFT",
  "NVDA",
  "GOOGL",
  "AMZN",
  "META",
  "AVGO",
  "ORCL",
  "AMD",
  "NFLX",
  "CRM",
  "TSLA",
  // Financials
  "JPM",
  "BAC",
  "WFC",
  "GS",
  "MS",
  "V",
  "MA",
  // Health care
  "UNH",
  "LLY",
  "JNJ",
  "PFE",
  // Consumer
  "WMT",
  "COST",
  "HD",
  "MCD",
  "KO",
  "DIS",
  // Energy / industrials / materials
  "XOM",
  "CVX",
  "CAT",
  "BA",
  "LIN",
  // Crypto
  "BTC",
  "ETH",
  "SOL",
];

/** FRED series refreshed by the macro job. */
export const TRACKED_MACRO_SERIES: readonly string[] = ["CPIAUCSL", "UNRATE", "DGS10"];
