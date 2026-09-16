/**
 * A small market universe so movers, the screener and quote pages render with
 * ZERO keys (§2). Prices are USD (§7). The Shariah-compliance flag powers the
 * screener's differentiating filter (§13). Values are illustrative fixtures.
 */
export interface UniverseRow {
  symbol: string;
  name: string;
  exchange: string;
  assetClass: "equity" | "crypto" | "index";
  nativeCurrency: string;
  sector: string | null;
  country: string;
  isShariahCompliant: boolean | null;
  dataDelayMinutes: number;
  priceUsd: number;
  change: number;
  changePct: number;
  marketCapUsd: number | null;
  volume: number | null;
}

export const UNIVERSE: UniverseRow[] = [
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    exchange: "NASDAQ",
    assetClass: "equity",
    nativeCurrency: "USD",
    sector: "Technology",
    country: "US",
    isShariahCompliant: true,
    dataDelayMinutes: 0,
    priceUsd: 229.87,
    change: 1.42,
    changePct: 0.62,
    marketCapUsd: 3.48e12,
    volume: 41_230_000,
  },
  {
    symbol: "MSFT",
    name: "Microsoft Corp.",
    exchange: "NASDAQ",
    assetClass: "equity",
    nativeCurrency: "USD",
    sector: "Technology",
    country: "US",
    isShariahCompliant: true,
    dataDelayMinutes: 0,
    priceUsd: 421.33,
    change: -2.11,
    changePct: -0.5,
    marketCapUsd: 3.13e12,
    volume: 18_900_000,
  },
  {
    symbol: "JPM",
    name: "JPMorgan Chase & Co.",
    exchange: "NYSE",
    assetClass: "equity",
    nativeCurrency: "USD",
    sector: "Financials",
    country: "US",
    isShariahCompliant: false,
    dataDelayMinutes: 0,
    priceUsd: 214.05,
    change: 1.98,
    changePct: 0.93,
    marketCapUsd: 6.1e11,
    volume: 8_400_000,
  },
  {
    symbol: "XOM",
    name: "Exxon Mobil Corp.",
    exchange: "NYSE",
    assetClass: "equity",
    nativeCurrency: "USD",
    sector: "Energy",
    country: "US",
    isShariahCompliant: true,
    dataDelayMinutes: 0,
    priceUsd: 117.6,
    change: -0.84,
    changePct: -0.71,
    marketCapUsd: 5.2e11,
    volume: 12_100_000,
  },
  {
    symbol: "TSLA",
    name: "Tesla Inc.",
    exchange: "NASDAQ",
    assetClass: "equity",
    nativeCurrency: "USD",
    sector: "Consumer Discretionary",
    country: "US",
    isShariahCompliant: true,
    dataDelayMinutes: 0,
    priceUsd: 248.5,
    change: 6.35,
    changePct: 2.62,
    marketCapUsd: 7.9e11,
    volume: 96_500_000,
  },
  {
    symbol: "HSBA",
    name: "HSBC Holdings plc",
    exchange: "LSE",
    assetClass: "equity",
    nativeCurrency: "GBP",
    sector: "Financials",
    country: "UK",
    isShariahCompliant: false,
    dataDelayMinutes: 15,
    priceUsd: 9.12,
    change: 0.04,
    changePct: 0.44,
    marketCapUsd: 1.7e11,
    volume: 22_000_000,
  },
  {
    symbol: "SHEL",
    name: "Shell plc",
    exchange: "LSE",
    assetClass: "equity",
    nativeCurrency: "GBP",
    sector: "Energy",
    country: "UK",
    isShariahCompliant: true,
    dataDelayMinutes: 15,
    priceUsd: 34.18,
    change: -0.29,
    changePct: -0.84,
    marketCapUsd: 2.1e11,
    volume: 6_700_000,
  },
  {
    symbol: "QNBK",
    name: "Qatar National Bank",
    exchange: "QSE",
    assetClass: "equity",
    nativeCurrency: "QAR",
    sector: "Financials",
    country: "QA",
    isShariahCompliant: false,
    dataDelayMinutes: 1440,
    priceUsd: 4.35,
    change: 0.02,
    changePct: 0.46,
    marketCapUsd: 4.0e10,
    volume: 3_200_000,
  },
  {
    symbol: "IQCD",
    name: "Industries Qatar",
    exchange: "QSE",
    assetClass: "equity",
    nativeCurrency: "QAR",
    sector: "Materials",
    country: "QA",
    isShariahCompliant: true,
    dataDelayMinutes: 1440,
    priceUsd: 3.58,
    change: 0.03,
    changePct: 0.85,
    marketCapUsd: 2.2e10,
    volume: 1_900_000,
  },
  {
    symbol: "BTC",
    name: "Bitcoin",
    exchange: "CRYPTO",
    assetClass: "crypto",
    nativeCurrency: "USD",
    sector: null,
    country: "—",
    isShariahCompliant: null,
    dataDelayMinutes: 0,
    priceUsd: 63_412.0,
    change: 812.0,
    changePct: 1.3,
    marketCapUsd: 1.25e12,
    volume: null,
  },
];

export function universeBySymbol(symbol: string): UniverseRow | undefined {
  return UNIVERSE.find((r) => r.symbol === symbol.toUpperCase());
}
