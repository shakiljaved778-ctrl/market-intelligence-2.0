import { pegReviewedOn, QAR_PER_USD } from "@/lib/currency/peg";
import { dbRecentFxRates, type FxRateRow } from "@/lib/db/queries/market";
import { demo } from "@/lib/demo/fixtures";
import { readCommoditySeries } from "@/lib/economy/read";
import { readUniverse } from "@/lib/market/read";

/**
 * Non-equity price rows for the markets page and the ticker: FX, commodities
 * and crypto. Each row carries its source and the time it refers to. A class
 * with nothing real stored returns [] and the surface shows an empty state.
 */
export interface LevelRow {
  symbol: string;
  name: string;
  value: number;
  /** Percent change vs the previous observation; null when there is none. */
  changePct: number | null;
  unit?: string;
  /** Short qualifier shown beside the name, e.g. "official peg". */
  note?: string;
  /** Human source label, e.g. "ECB reference rate". */
  source: string;
  /** ISO date or timestamp the value refers to. */
  asOf: string;
  /** Cadence qualifier for the stamp: "daily fixing", "daily", "pegged", … */
  cadence: string;
  /** Link target (crypto rows link to their quote page). */
  href?: string;
  demo: boolean;
}

/** FX pairs shown, expressed against the USD-base reference rates we store. */
const FX_PAIRS: { symbol: string; name: string; quote: string; invert: boolean }[] = [
  { symbol: "EURUSD", name: "EUR / USD", quote: "EUR", invert: true },
  { symbol: "GBPUSD", name: "GBP / USD", quote: "GBP", invert: true },
  { symbol: "USDJPY", name: "USD / JPY", quote: "JPY", invert: false },
  { symbol: "USDCHF", name: "USD / CHF", quote: "CHF", invert: false },
  { symbol: "USDINR", name: "USD / INR", quote: "INR", invert: false },
  { symbol: "USDCNY", name: "USD / CNY", quote: "CNY", invert: false },
];

/** Currencies the FX job must fetch (USD base). */
export const FX_QUOTE_CURRENCIES = FX_PAIRS.map((p) => p.quote);

export const FX_SOURCE = "ECB reference rate";

function pct(now: number, prev: number | undefined): number | null {
  if (prev === undefined || prev === 0) return null;
  return ((now - prev) / prev) * 100;
}

/** Pure: build the FX rows from stored USD-base rates (newest first per quote). */
export function fxRowsFrom(rates: FxRateRow[]): LevelRow[] {
  const byQuote = new Map<string, FxRateRow[]>();
  for (const r of rates) {
    byQuote.set(r.quote, [...(byQuote.get(r.quote) ?? []), r]);
  }
  const rows: LevelRow[] = [];
  for (const pair of FX_PAIRS) {
    const series = (byQuote.get(pair.quote) ?? []).sort((a, b) =>
      a.date < b.date ? 1 : -1,
    );
    const latest = series[0];
    if (!latest) continue;
    const prev = series[1];
    const value = pair.invert ? 1 / latest.rate : latest.rate;
    const prevValue = prev ? (pair.invert ? 1 / prev.rate : prev.rate) : undefined;
    rows.push({
      symbol: pair.symbol,
      name: pair.name,
      value,
      changePct: pct(value, prevValue),
      source: FX_SOURCE,
      asOf: latest.date,
      cadence: "daily fixing",
      demo: false,
    });
  }
  return rows;
}

/** The USD/QAR peg is a policy constant, not a market quote — labelled so. */
function pegRow(): LevelRow {
  return {
    symbol: "USDQAR",
    name: "USD / QAR",
    value: QAR_PER_USD,
    changePct: null,
    note: "official peg",
    source: "Qatar Central Bank peg",
    asOf: pegReviewedOn,
    cadence: "pegged",
    demo: false,
  };
}

function demoRows(kind: "fx" | "commodity"): LevelRow[] {
  const rows = kind === "fx" ? demo.fxRows() : demo.commodityRows();
  return rows.map((r) => ({
    symbol: r.symbol,
    name: r.name,
    value: r.price,
    changePct: r.changePct,
    unit: r.unit,
    note: r.note,
    source: "Demo data",
    asOf: new Date().toISOString().slice(0, 10),
    cadence: "demo",
    demo: true,
  }));
}

export async function readFxRows(): Promise<LevelRow[]> {
  let rates: FxRateRow[] = [];
  try {
    rates = await dbRecentFxRates("USD");
  } catch (err) {
    console.error("[levels] fx read failed:", err);
  }
  const rows = fxRowsFrom(rates);
  if (rows.length > 0) return [...rows, pegRow()];
  return demoRows("fx");
}

export async function readCommodityRows(): Promise<LevelRow[]> {
  const series = await readCommoditySeries();
  const rows: LevelRow[] = [];
  for (const s of series) {
    const last = s.observations.at(-1);
    if (!last) continue;
    const prev = s.observations.at(-2);
    rows.push({
      symbol: s.id.split(":").pop() ?? s.id,
      name: s.name,
      value: last.value,
      changePct: pct(last.value, prev?.value),
      unit: s.unit,
      source: s.source,
      asOf: last.date,
      cadence: "daily",
      demo: false,
    });
  }
  if (rows.length > 0) return rows;
  return demoRows("commodity");
}

export async function readCryptoRows(limit = 6): Promise<LevelRow[]> {
  const rows = (await readUniverse()).filter((r) => r.assetClass === "crypto");
  return rows
    .sort((a, b) => (b.marketCapUsd ?? 0) - (a.marketCapUsd ?? 0))
    .slice(0, limit)
    .map((r) => ({
      symbol: r.symbol,
      name: r.name,
      value: r.priceUsd,
      changePct: r.changePct,
      source: r.priced.source ?? "",
      asOf: r.priced.asOf ?? "",
      cadence: "24h change",
      href: `/quote/${r.symbol}`,
      demo: r.priced.demo,
    }));
}
