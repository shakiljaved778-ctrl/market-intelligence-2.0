import {
  CALENDAR_EVENTS,
  MACRO_SERIES,
  YIELD_CURVE,
  type CalendarEventFixture,
  type MacroSeriesFixture,
} from "@/fixtures/macro";

/**
 * Read layer for /economy (§13). Fixture-backed so macro pages render from
 * cache with zero keys and never call a vendor on render. In production the
 * macro job persists FRED/World Bank series to Postgres and this reads them
 * back — identical shape, unchanged UI.
 */
export async function readMacroSeries(): Promise<MacroSeriesFixture[]> {
  return MACRO_SERIES;
}

export async function readSeries(id: string): Promise<MacroSeriesFixture | null> {
  return MACRO_SERIES.find((s) => s.id === id) ?? null;
}

export async function readYieldCurve(): Promise<{ tenor: string; yieldPct: number }[]> {
  return YIELD_CURVE;
}

export async function readCalendar(): Promise<CalendarEventFixture[]> {
  return [...CALENDAR_EVENTS].sort(
    (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime(),
  );
}
