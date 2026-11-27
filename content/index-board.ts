/**
 * The index board at the top of every page (owner request, 2026-11-27).
 *
 * Mizaan has no licensed index feed, so each US index is shown through the
 * exchange-traded fund that tracks it (owner decision, 2026-11-27: "use ETF
 * trackers"). The card says so — "S&P 500 · via SPY" — and prints the FUND's
 * price, never an invented index level. Its percentage move tracks the index
 * closely; the price does not equal the index level.
 *
 * These symbols are refreshed by the quotes job (lib/jobs/tracked.ts) but are
 * deliberately NOT in content/instruments.ts, so funds never appear among the
 * stock movers, heatmap or screener.
 */
export interface IndexTracker {
  /** The ETF symbol priced by the quotes job. */
  symbol: string;
  /** The index (or asset) the fund tracks, as shown on the card. */
  label: string;
}

export const INDEX_TRACKERS: readonly IndexTracker[] = [
  { symbol: "SPY", label: "S&P 500" },
  { symbol: "QQQ", label: "Nasdaq 100" },
  { symbol: "DIA", label: "Dow Jones" },
  { symbol: "IWM", label: "Russell 2000" },
  { symbol: "GLD", label: "Gold" },
];
