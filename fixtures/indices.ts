/**
 * Fixture data so the app renders a useful shell with ZERO keys configured
 * (§2 fixture mode). All prices are stored in USD (§7); index levels are
 * currency-neutral and are never converted. Values are illustrative only and
 * are clearly sourced as fixtures in the UI.
 */
export interface IndexStripItem {
  symbol: string;
  name: string;
  /** Currency-neutral level (never converted). */
  level: number;
  change: number;
  changePct: number;
  /** Regional rail marker — GCC entries are EOD-only and labelled delayed. */
  region: "US" | "EU" | "APAC" | "GCC";
  delayLabel?: string;
}

export const INDEX_STRIP: IndexStripItem[] = [
  {
    symbol: "SPX",
    name: "S&P 500",
    level: 5487.03,
    change: 12.44,
    changePct: 0.23,
    region: "US",
  },
  {
    symbol: "NDX",
    name: "Nasdaq 100",
    level: 19764.2,
    change: -41.9,
    changePct: -0.21,
    region: "US",
  },
  {
    symbol: "DJI",
    name: "Dow Jones",
    level: 39411.21,
    change: 87.6,
    changePct: 0.22,
    region: "US",
  },
  {
    symbol: "UKX",
    name: "FTSE 100",
    level: 8204.98,
    change: -9.12,
    changePct: -0.11,
    region: "EU",
  },
  {
    symbol: "SXXP",
    name: "STOXX 600",
    level: 512.34,
    change: 1.87,
    changePct: 0.37,
    region: "EU",
  },
  {
    symbol: "N225",
    name: "Nikkei 225",
    level: 38102.4,
    change: 241.1,
    changePct: 0.64,
    region: "APAC",
  },
  {
    symbol: "DSM",
    name: "QSE Index",
    level: 10412.66,
    change: 18.4,
    changePct: 0.18,
    region: "GCC",
    delayLabel: "EOD · prior close",
  },
];
