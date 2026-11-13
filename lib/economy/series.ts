/**
 * The macro, commodity and yield-curve series Mizaan tracks. Reference config
 * only — every VALUE comes from the provider named here, fetched by the macro
 * job and stored in `macro_obs`. Nothing on a page is typed in by hand.
 */
export type SeriesGroup = "macro" | "commodity" | "curve";

export interface SeriesConfig {
  /** Stable id used in URLs and storage, e.g. "FRED:DGS10". */
  id: string;
  provider: "fred" | "worldbank";
  /** Provider series code (FRED id or World Bank indicator). */
  code: string;
  /** World Bank ISO3 country code. */
  country?: string;
  name: string;
  unit: string;
  frequency: "daily" | "weekly" | "monthly" | "annual";
  region: string;
  /** Source label shown beside every value. */
  source: string;
  groups: SeriesGroup[];
  /**
   * Deterministic transform applied at read time, stated in the UI:
   * yoy = percent change on the same month a year earlier; bn = value / 1e9.
   */
  transform?: "yoy" | "bn";
  /** Yield-curve tenor label. */
  tenor?: string;
  /** How much history the job requests and the page charts, in days. */
  historyDays: number;
}

const D = 400; // daily series: a little over a year
const M = 365 * 6; // monthly: six years (five charted + twelve months for YoY)
const A = 365 * 30; // annual

export const SERIES: SeriesConfig[] = [
  {
    id: "FRED:CPIAUCSL",
    provider: "fred",
    code: "CPIAUCSL",
    name: "US CPI (year on year)",
    unit: "%",
    frequency: "monthly",
    region: "US",
    source: "FRED (BLS)",
    groups: ["macro"],
    transform: "yoy",
    historyDays: M,
  },
  {
    id: "FRED:UNRATE",
    provider: "fred",
    code: "UNRATE",
    name: "US unemployment rate",
    unit: "%",
    frequency: "monthly",
    region: "US",
    source: "FRED (BLS)",
    groups: ["macro"],
    historyDays: M,
  },
  {
    id: "FRED:FEDFUNDS",
    provider: "fred",
    code: "FEDFUNDS",
    name: "US federal funds rate",
    unit: "%",
    frequency: "monthly",
    region: "US",
    source: "FRED (Federal Reserve)",
    groups: ["macro"],
    historyDays: M,
  },
  {
    id: "FRED:MORTGAGE30US",
    provider: "fred",
    code: "MORTGAGE30US",
    name: "US 30-year mortgage rate",
    unit: "%",
    frequency: "weekly",
    region: "US",
    source: "FRED (Freddie Mac)",
    groups: ["macro"],
    historyDays: D,
  },
  {
    id: "FRED:DGS3MO",
    provider: "fred",
    code: "DGS3MO",
    name: "US 3-month Treasury yield",
    unit: "%",
    frequency: "daily",
    region: "US",
    source: "FRED (US Treasury)",
    groups: ["curve"],
    tenor: "3M",
    historyDays: D,
  },
  {
    id: "FRED:DGS1",
    provider: "fred",
    code: "DGS1",
    name: "US 1-year Treasury yield",
    unit: "%",
    frequency: "daily",
    region: "US",
    source: "FRED (US Treasury)",
    groups: ["macro", "curve"],
    tenor: "1Y",
    historyDays: D,
  },
  {
    id: "FRED:DGS2",
    provider: "fred",
    code: "DGS2",
    name: "US 2-year Treasury yield",
    unit: "%",
    frequency: "daily",
    region: "US",
    source: "FRED (US Treasury)",
    groups: ["macro", "curve"],
    tenor: "2Y",
    historyDays: D,
  },
  {
    id: "FRED:DGS5",
    provider: "fred",
    code: "DGS5",
    name: "US 5-year Treasury yield",
    unit: "%",
    frequency: "daily",
    region: "US",
    source: "FRED (US Treasury)",
    groups: ["macro", "curve"],
    tenor: "5Y",
    historyDays: D,
  },
  {
    id: "FRED:DGS10",
    provider: "fred",
    code: "DGS10",
    name: "US 10-year Treasury yield",
    unit: "%",
    frequency: "daily",
    region: "US",
    source: "FRED (US Treasury)",
    groups: ["macro", "curve"],
    tenor: "10Y",
    historyDays: D,
  },
  {
    id: "FRED:DGS30",
    provider: "fred",
    code: "DGS30",
    name: "US 30-year Treasury yield",
    unit: "%",
    frequency: "daily",
    region: "US",
    source: "FRED (US Treasury)",
    groups: ["macro", "curve"],
    tenor: "30Y",
    historyDays: D,
  },
  {
    id: "FRED:T10Y2Y",
    provider: "fred",
    code: "T10Y2Y",
    name: "US 10-year minus 2-year Treasury spread",
    unit: "pp",
    frequency: "daily",
    region: "US",
    source: "FRED (St. Louis Fed)",
    groups: ["macro"],
    historyDays: D,
  },
  {
    id: "FRED:T10Y3M",
    provider: "fred",
    code: "T10Y3M",
    name: "US 10-year minus 3-month Treasury spread",
    unit: "pp",
    frequency: "daily",
    region: "US",
    source: "FRED (St. Louis Fed)",
    groups: ["macro"],
    historyDays: D,
  },
  // Energy benchmarks — daily spot prices published by the US EIA, via FRED.
  {
    id: "FRED:DCOILBRENTEU",
    provider: "fred",
    code: "DCOILBRENTEU",
    name: "Brent crude",
    unit: "USD/bbl",
    frequency: "daily",
    region: "Global",
    source: "FRED (EIA)",
    groups: ["commodity"],
    historyDays: D,
  },
  {
    id: "FRED:DCOILWTICO",
    provider: "fred",
    code: "DCOILWTICO",
    name: "WTI crude",
    unit: "USD/bbl",
    frequency: "daily",
    region: "US",
    source: "FRED (EIA)",
    groups: ["commodity"],
    historyDays: D,
  },
  {
    id: "FRED:DHHNGSP",
    provider: "fred",
    code: "DHHNGSP",
    name: "Henry Hub natural gas",
    unit: "USD/MMBtu",
    frequency: "daily",
    region: "US",
    source: "FRED (EIA)",
    groups: ["commodity"],
    historyDays: D,
  },
  // GCC national accounts — World Bank open data (annual).
  {
    id: "WB:QAT:NY.GDP.MKTP.CD",
    provider: "worldbank",
    code: "NY.GDP.MKTP.CD",
    country: "QAT",
    name: "Qatar GDP (current USD)",
    unit: "USD bn",
    frequency: "annual",
    region: "QA",
    source: "World Bank",
    groups: ["macro"],
    transform: "bn",
    historyDays: A,
  },
  {
    id: "WB:SAU:NY.GDP.MKTP.CD",
    provider: "worldbank",
    code: "NY.GDP.MKTP.CD",
    country: "SAU",
    name: "Saudi Arabia GDP (current USD)",
    unit: "USD bn",
    frequency: "annual",
    region: "SA",
    source: "World Bank",
    groups: ["macro"],
    transform: "bn",
    historyDays: A,
  },
  {
    id: "WB:ARE:NY.GDP.MKTP.CD",
    provider: "worldbank",
    code: "NY.GDP.MKTP.CD",
    country: "ARE",
    name: "UAE GDP (current USD)",
    unit: "USD bn",
    frequency: "annual",
    region: "AE",
    source: "World Bank",
    groups: ["macro"],
    transform: "bn",
    historyDays: A,
  },
];

export function seriesConfig(id: string): SeriesConfig | null {
  return SERIES.find((s) => s.id === id) ?? null;
}

export function seriesInGroup(group: SeriesGroup): SeriesConfig[] {
  return SERIES.filter((s) => s.groups.includes(group));
}
