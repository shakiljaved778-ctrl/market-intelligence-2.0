/**
 * The index board at the top of every page (owner request, 2026-11-27).
 *
 * Mizaan has no licensed index feed, so each US index is shown through the
 * exchange-traded fund that tracks it (owner decision, 2026-11-27: "use ETF
 * trackers"). The card says so — "S&P 500 · via SPY" — and prints the FUND's
 * price, never an invented index level. Its percentage move tracks the index
 * closely; the price does not equal the index level.
 *
 * Japan, the UK and India (owner decision, 2026-11-27) have no US fund that
 * tracks the Nikkei 225, FTSE 100 or BSE Sensex, so their cards use the
 * iShares MSCI country funds and are labelled by COUNTRY with the MSCI index
 * named — never as Nikkei, FTSE or Sensex, which they are not.
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
  /** Qualifier under the label; defaults to "via <symbol> ETF". */
  via?: string;
}

export const INDEX_TRACKERS: readonly IndexTracker[] = [
  { symbol: "SPY", label: "S&P 500" },
  { symbol: "QQQ", label: "Nasdaq 100" },
  { symbol: "DIA", label: "Dow Jones" },
  { symbol: "IWM", label: "Russell 2000" },
  { symbol: "EWJ", label: "Japan", via: "MSCI Japan · via EWJ" },
  { symbol: "EWU", label: "UK", via: "MSCI UK · via EWU" },
  { symbol: "INDA", label: "India", via: "MSCI India · via INDA" },
  // 2026-11-28 (brief §5): Germany and Hong Kong by the same country-fund rule
  // (labelled by country, never as DAX or Hang Seng), and the US dollar via the
  // Invesco fund that tracks the dollar index (never shown as a DXY level).
  { symbol: "EWG", label: "Germany", via: "MSCI Germany · via EWG" },
  { symbol: "EWH", label: "Hong Kong", via: "MSCI Hong Kong · via EWH" },
  { symbol: "UUP", label: "US dollar", via: "Dollar index fund · via UUP" },
  { symbol: "GLD", label: "Gold" },
];
