import { dbSeriesObservations } from "@/lib/db/queries/market";
import { demo } from "@/lib/demo/fixtures";
import { isDemoMode } from "@/lib/demo/mode";
import { SERIES, seriesConfig, seriesInGroup, type SeriesConfig } from "./series";

/**
 * Read layer for /economy and the commodity rows. Reads the observations the
 * macro job stored (`macro_obs`) — never a vendor, never a typed-in value. A
 * series with nothing stored is simply absent, and the page shows an empty
 * state. Fixtures appear only under DEMO_MODE=1, flagged `demo`.
 */
export interface MacroSeries {
  id: string;
  name: string;
  unit: string;
  frequency: string;
  source: string;
  region: string;
  observations: { date: string; value: number }[];
  /** Date of the latest observation (YYYY-MM-DD). */
  asOf: string | null;
  /** Stated when the displayed values are derived from the raw series. */
  method: string | null;
  demo: boolean;
}

export interface CalendarEvent {
  kind: "earnings" | "macro" | "ipo" | "dividend";
  ts: string;
  title: string;
  symbol?: string;
  consensus?: number;
  actual?: number;
  previous?: number;
  importance: number;
}

type Obs = { date: string; value: number };

function round(v: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
}

/** Year-on-year percent change for a monthly index series. */
export function yearOnYear(obs: Obs[]): Obs[] {
  const byMonth = new Map(obs.map((o) => [o.date.slice(0, 7), o.value]));
  const out: Obs[] = [];
  for (const o of obs) {
    const [y, m] = o.date.split("-");
    const prior = byMonth.get(`${Number(y) - 1}-${m}`);
    if (prior === undefined || prior === 0) continue;
    out.push({ date: o.date, value: round((o.value / prior - 1) * 100) });
  }
  return out;
}

function applyTransform(cfg: SeriesConfig, obs: Obs[]): Obs[] {
  if (cfg.transform === "yoy") return yearOnYear(obs);
  if (cfg.transform === "bn") {
    return obs.map((o) => ({ date: o.date, value: round(o.value / 1e9, 1) }));
  }
  return obs;
}

function methodOf(cfg: SeriesConfig): string | null {
  if (cfg.transform === "yoy") {
    return `Year-on-year change computed by Mizaan from the ${cfg.code} index.`;
  }
  if (cfg.transform === "bn") return "Shown in billions of US dollars.";
  return null;
}

// One stored read for all tracked series, memoised briefly per instance.
const MEMO_MS = 10 * 60_000;
let memo: { at: number; byId: Map<string, Obs[]> } | null = null;

async function storedObservations(): Promise<Map<string, Obs[]>> {
  if (memo && Date.now() - memo.at < MEMO_MS) return memo.byId;
  const byId = new Map<string, Obs[]>();
  try {
    // Group the reads by history window so a daily series is not read for 30y.
    const windows = new Map<number, string[]>();
    for (const s of SERIES) {
      windows.set(s.historyDays, [...(windows.get(s.historyDays) ?? []), s.id]);
    }
    for (const [days, ids] of windows) {
      for (const o of await dbSeriesObservations(ids, days)) {
        const list = byId.get(o.seriesId) ?? [];
        list.push({ date: o.date, value: o.value });
        byId.set(o.seriesId, list);
      }
    }
    memo = { at: Date.now(), byId };
  } catch (err) {
    console.error("[economy] stored-series read failed:", err);
    return memo?.byId ?? byId;
  }
  return byId;
}

/** Test seam. */
export function __resetEconomyMemo(): void {
  memo = null;
}

function build(cfg: SeriesConfig, raw: Obs[]): MacroSeries | null {
  const observations = applyTransform(cfg, raw);
  if (observations.length === 0) return null;
  return {
    id: cfg.id,
    name: cfg.name,
    unit: cfg.unit,
    frequency: cfg.frequency,
    source: cfg.source,
    region: cfg.region,
    observations,
    asOf: observations.at(-1)?.date ?? null,
    method: methodOf(cfg),
    demo: false,
  };
}

function demoSeries(): MacroSeries[] {
  return demo.macroSeries().map((s) => ({
    ...s,
    asOf: s.observations.at(-1)?.date ?? null,
    method: null,
    demo: true,
  }));
}

async function readGroup(
  group: "macro" | "commodity" | "curve",
): Promise<MacroSeries[]> {
  const stored = await storedObservations();
  const out: MacroSeries[] = [];
  for (const cfg of seriesInGroup(group)) {
    const s = build(cfg, stored.get(cfg.id) ?? []);
    if (s) out.push(s);
  }
  return out;
}

export async function readMacroSeries(): Promise<MacroSeries[]> {
  const real = await readGroup("macro");
  if (real.length > 0) return real;
  return isDemoMode() ? demoSeries() : [];
}

export async function readCommoditySeries(): Promise<MacroSeries[]> {
  return readGroup("commodity");
}

export async function readSeries(id: string): Promise<MacroSeries | null> {
  const cfg = seriesConfig(id);
  if (cfg) {
    const s = build(cfg, (await storedObservations()).get(cfg.id) ?? []);
    if (s) return s;
  }
  return demoSeries().find((s) => s.id === id) ?? null;
}

export interface YieldCurve {
  points: { tenor: string; yieldPct: number }[];
  /** Latest observation date across the tenors. */
  asOf: string | null;
  source: string | null;
  demo: boolean;
}

export async function readYieldCurve(): Promise<YieldCurve> {
  const stored = await storedObservations();
  const points: { tenor: string; yieldPct: number }[] = [];
  let asOf: string | null = null;
  for (const cfg of seriesInGroup("curve")) {
    const last = (stored.get(cfg.id) ?? []).at(-1);
    if (!last || !cfg.tenor) continue;
    points.push({ tenor: cfg.tenor, yieldPct: last.value });
    if (!asOf || last.date > asOf) asOf = last.date;
  }
  // A curve needs at least three tenors to mean anything.
  if (points.length >= 3) {
    return { points, asOf, source: "FRED (US Treasury)", demo: false };
  }
  if (isDemoMode()) {
    return { points: demo.yieldCurve(), asOf: null, source: null, demo: true };
  }
  return { points: [], asOf: null, source: null, demo: false };
}

/**
 * Scheduled macro events. No real calendar source is connected yet, so in
 * production this is empty and the page says so (the footer link is hidden
 * while it is). Demo mode shows the committed sample events.
 */
export async function readCalendar(): Promise<CalendarEvent[]> {
  return [...demo.calendar()].sort(
    (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime(),
  );
}
