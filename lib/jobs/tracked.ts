import { instrumentBySymbol } from "@/content/instruments";

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
 * a call to return nothing — and are simply absent from price surfaces.
 *
 * Every symbol here is US-listed (NYSE/NASDAQ) or a US-listed ADR, plus the major
 * crypto. Instruments outside this list have no stored price and are not shown on
 * price surfaces until a feed covers them.
 */
export const TRACKED_SYMBOLS: readonly string[] = [
  // Index trackers for the index board (content/index-board.ts) — first, so a
  // run that is cut short still refreshes the top of every page.
  "SPY",
  "QQQ",
  "DIA",
  "IWM",
  "EWJ",
  "EWU",
  "INDA",
  "EWG",
  "EWH",
  "UUP",
  "GLD",
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
  "ANT", // Anthropic — Nasdaq listing, 19 Nov 2026
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
  // Widened 2026-11-28 so no heatmap sector shows one or two tiles (brief §2.2).
  "COP",
  "SLB",
  "SHEL",
  "FCX",
  "NEM",
  "RIO",
  "SHW",
  "VOD",
  "BA",
  "CAT",
  "GE",
  "HON",
  "UPS",
  // More large-caps (all already in the universe) — widen live-quote coverage
  // while staying under Finnhub's free 60/min ceiling.
  "TXN",
  "IBM",
  "NOW",
  "MU",
  "PEP",
  "ABT",
  "TMO",
  "LIN",
  "LMT",
  // US-listed ADRs (Finnhub free covers these)
  "TSM",
  "ASML",
  "BABA",
  "TM",
  "SONY",
  "NVO",
  // Crypto (CoinGecko, keyless ~30/min — separate budget from Finnhub, so we can
  // widen crypto coverage without touching the equities ceiling).
  "BTC",
  "ETH",
  "SOL",
  "XRP",
  "ADA",
  "DOGE",
  "BNB",
  "TRX",
  "LINK",
  "DOT",
  "AVAX",
  "LTC",
  "BCH",
  "ATOM",
  "UNI",
  "NEAR",
  "APT",
  "ARB",
];

/**
 * Core symbols whose real daily candles are backfilled by the once-daily EOD job
 * (`eod.yml`). Kept deliberately smaller than the live-quote list: candle
 * providers have much tighter free tiers than quotes (Polygon ~5/min, EODHD
 * ~100/day), and this job fetches `count × BACKFILL_RANGES` series. Symbols not
 * listed here have no stored series, so their chart shows an empty state — we
 * spend the scarce candle budget on the most-viewed names.
 */
/**
 * Most quotes asked of the per-minute-limited equity provider in one run
 * (2026-11-28). Finnhub's free tier allows 60 calls a minute and 30 a second;
 * the list above is longer than that, and a run that asked for all of it hit
 * 429s, tripped the provider's circuit breaker and left the END of the list
 * unrefreshed for days (seen: LIN, LMT, SONY, TM, NVO stuck at 24–26 Nov). Each
 * run now asks for a fixed budget: the index board every time, the rest in
 * turn, so every symbol is refreshed every few runs.
 */
export const EQUITY_QUOTES_PER_RUN = 45;
/**
 * PURE: the symbols one quotes run refreshes, in order, and where the next run
 * should start. Crypto (CoinGecko, a separate budget) is always included;
 * `pinned` (the index board) always come first; the remaining equities are
 * taken in turn from `cursor`, so consecutive runs walk the whole list
 * whatever their timing. (A start derived from the clock alone repeated the
 * same half of the list when runs were an even number of slots apart.)
 */
export function quotesForRun(
  symbols: readonly string[],
  opts: { cursor: number; pinned: readonly string[]; isCrypto: (s: string) => boolean },
): { symbols: string[]; nextCursor: number } {
  const pinnedSet = new Set(opts.pinned);
  const pinned = symbols.filter((s) => pinnedSet.has(s));
  const crypto = symbols.filter((s) => !pinnedSet.has(s) && opts.isCrypto(s));
  const rest = symbols.filter((s) => !pinnedSet.has(s) && !opts.isCrypto(s));
  const room = Math.max(0, EQUITY_QUOTES_PER_RUN - pinned.length);
  if (rest.length <= room)
    return { symbols: [...pinned, ...rest, ...crypto], nextCursor: 0 };
  const start = ((Math.trunc(opts.cursor) % rest.length) + rest.length) % rest.length;
  const turn = Array.from(
    { length: room },
    (_, i) => rest[(start + i) % rest.length] as string,
  );
  return {
    symbols: [...pinned, ...turn, ...crypto],
    nextCursor: (start + room) % rest.length,
  };
}

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

/**
 * Equities whose daily price history the EOD job keeps (lib/jobs/tasks.ts):
 * the core BACKFILL_SYMBOLS first, then every other tracked equity. Crypto is
 * left out — no configured provider serves its daily history.
 */
export function historySymbols(): string[] {
  const equities = TRACKED_SYMBOLS.filter(
    (s) => instrumentBySymbol(s)?.assetClass === "equity",
  );
  return [...new Set([...BACKFILL_SYMBOLS, ...equities])];
}
