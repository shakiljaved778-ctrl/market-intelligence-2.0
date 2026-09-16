/**
 * Macro fixtures so /economy renders with ZERO keys (§2). Series mirror the
 * macro_series/macro_obs shape; observations are monthly/annual illustrative
 * values, clearly labelled as fixtures in the UI.
 */
export interface MacroSeriesFixture {
  id: string;
  name: string;
  unit: string;
  frequency: string;
  source: string;
  region: string;
  observations: { date: string; value: number }[];
}

function ramp(
  start: number,
  step: number,
  months: string[],
): { date: string; value: number }[] {
  return months.map((date, i) => ({
    date,
    value: Number((start + step * i).toFixed(2)),
  }));
}

const M = [
  "2026-01-01",
  "2026-02-01",
  "2026-03-01",
  "2026-04-01",
  "2026-05-01",
  "2026-06-01",
];

export const MACRO_SERIES: MacroSeriesFixture[] = [
  {
    id: "FRED:CPIAUCSL",
    name: "US CPI (YoY)",
    unit: "%",
    frequency: "monthly",
    source: "FRED",
    region: "US",
    observations: ramp(3.1, -0.12, M),
  },
  {
    id: "FRED:UNRATE",
    name: "US Unemployment",
    unit: "%",
    frequency: "monthly",
    source: "FRED",
    region: "US",
    observations: ramp(3.9, 0.03, M),
  },
  {
    id: "FRED:DGS10",
    name: "US 10Y Treasury",
    unit: "%",
    frequency: "monthly",
    source: "FRED",
    region: "US",
    observations: ramp(4.25, -0.05, M),
  },
  {
    id: "WB:QAT:GDP",
    name: "Qatar GDP (annual)",
    unit: "USD bn",
    frequency: "annual",
    source: "World Bank",
    region: "QA",
    observations: [
      { date: "2022", value: 237.3 },
      { date: "2023", value: 213.0 },
      { date: "2024", value: 221.4 },
      { date: "2025", value: 229.8 },
    ],
  },
];

/** US Treasury yield curve (fixture) — currency-neutral levels. */
export const YIELD_CURVE: { tenor: string; yieldPct: number }[] = [
  { tenor: "3M", yieldPct: 4.62 },
  { tenor: "2Y", yieldPct: 4.18 },
  { tenor: "5Y", yieldPct: 4.05 },
  { tenor: "10Y", yieldPct: 4.0 },
  { tenor: "30Y", yieldPct: 4.28 },
];

export interface CalendarEventFixture {
  kind: "earnings" | "macro" | "ipo" | "dividend";
  ts: string;
  title: string;
  symbol?: string;
  consensus?: number;
  actual?: number;
  previous?: number;
  importance: number;
}

export const CALENDAR_EVENTS: CalendarEventFixture[] = [
  {
    kind: "macro",
    ts: "2026-09-16T12:30:00Z",
    title: "US CPI (Aug)",
    consensus: 2.9,
    actual: 2.8,
    previous: 3.0,
    importance: 90,
  },
  {
    kind: "macro",
    ts: "2026-09-17T18:00:00Z",
    title: "FOMC rate decision",
    consensus: 5.25,
    previous: 5.25,
    importance: 100,
  },
  {
    kind: "earnings",
    ts: "2026-09-18T20:00:00Z",
    title: "Apple Q4 earnings",
    symbol: "AAPL",
    consensus: 1.52,
    importance: 80,
  },
  {
    kind: "macro",
    ts: "2026-09-19T08:30:00Z",
    title: "Qatar CPI (Aug)",
    previous: 1.1,
    importance: 60,
  },
  {
    kind: "earnings",
    ts: "2026-09-22T20:00:00Z",
    title: "Microsoft Q1 earnings",
    symbol: "MSFT",
    consensus: 3.1,
    importance: 78,
  },
];
