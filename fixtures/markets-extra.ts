/**
 * Illustrative FX and commodity rows for the /markets asset tabs (fixture mode).
 * Stored in USD terms where applicable; FX pairs quote as shown. Clearly sample
 * data — a live feed replaces these once configured. The USD/QAR peg mirrors
 * lib/currency/peg.ts (3.64, presentation-only).
 */
export interface MarketQuoteRow {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  unit?: string;
  note?: string;
}

export const FX_ROWS: MarketQuoteRow[] = [
  { symbol: "EURUSD", name: "EUR / USD", price: 1.0842, changePct: 0.12 },
  { symbol: "GBPUSD", name: "GBP / USD", price: 1.2671, changePct: -0.18 },
  { symbol: "USDJPY", name: "USD / JPY", price: 152.34, changePct: 0.27 },
  { symbol: "USDQAR", name: "USD / QAR", price: 3.64, changePct: 0, note: "pegged" },
  { symbol: "AUDUSD", name: "AUD / USD", price: 0.6588, changePct: -0.09 },
];

export const COMMODITY_ROWS: MarketQuoteRow[] = [
  { symbol: "XAU", name: "Gold", price: 2654.3, changePct: 0.82, unit: "/oz" },
  { symbol: "XAG", name: "Silver", price: 31.18, changePct: 1.04, unit: "/oz" },
  {
    symbol: "BRENT",
    name: "Brent Crude",
    price: 74.12,
    changePct: -0.51,
    unit: "/bbl",
  },
  { symbol: "WTI", name: "WTI Crude", price: 70.33, changePct: -0.58, unit: "/bbl" },
  { symbol: "NG", name: "Nat. Gas", price: 2.84, changePct: 1.76, unit: "/MMBtu" },
];
