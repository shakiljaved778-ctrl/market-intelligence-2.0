import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { dbRead, getDb } from "@/lib/db/client";
import { fxRates, macroObs, macroSeries, recaps } from "@/lib/db/schema";

/**
 * Persistence for the non-equity price surfaces (Phase 1): FX reference rates,
 * macro / commodity series and computed recaps. The scheduled jobs are the only
 * writers; pages read these and never call a vendor. All no-op without a DB.
 */

// ── FX reference rates ───────────────────────────────────────────────────────

export interface FxRateRow {
  base: string;
  quote: string;
  date: string; // YYYY-MM-DD
  rate: number;
  source: string;
}

export async function persistFxRates(rows: FxRateRow[]): Promise<number> {
  const db = getDb();
  if (!db || rows.length === 0) return 0;
  await db
    .insert(fxRates)
    .values(rows)
    .onConflictDoUpdate({
      target: [fxRates.base, fxRates.quote, fxRates.date],
      set: { rate: sql`excluded.rate`, source: sql`excluded.source` },
    });
  return rows.length;
}

/** The most recent `perPair` observations per quote currency for a base. */
export async function dbRecentFxRates(
  base: string,
  sinceDays = 21,
): Promise<FxRateRow[]> {
  return dbRead("dbRecentFxRates", async () => {
    const db = getDb();
    if (!db) return [];
    const since = new Date(Date.now() - sinceDays * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const rows = await db
      .select()
      .from(fxRates)
      .where(and(eq(fxRates.base, base), gte(fxRates.date, since)))
      .orderBy(fxRates.quote, desc(fxRates.date));
    return rows.map((r) => ({
      base: r.base,
      quote: r.quote,
      date: r.date,
      rate: r.rate,
      source: r.source,
    }));
  });
}

// ── Macro / commodity series ─────────────────────────────────────────────────

export interface SeriesMeta {
  id: string; // e.g. "FRED:DGS10"
  name: string;
  unit: string | null;
  frequency: string | null;
  source: string;
  region: string | null;
}

export async function persistSeries(
  meta: SeriesMeta,
  observations: { date: string; value: number | null }[],
): Promise<number> {
  const db = getDb();
  if (!db) return 0;
  await db
    .insert(macroSeries)
    .values(meta)
    .onConflictDoUpdate({
      target: macroSeries.id,
      set: {
        name: meta.name,
        unit: meta.unit,
        frequency: meta.frequency,
        source: meta.source,
        region: meta.region,
      },
    });
  const rows = observations
    .filter((o) => o.value !== null && Number.isFinite(o.value))
    .map((o) => ({ seriesId: meta.id, date: o.date, value: o.value }));
  // Insert in chunks — a long daily series is thousands of rows.
  for (let i = 0; i < rows.length; i += 500) {
    await db
      .insert(macroObs)
      .values(rows.slice(i, i + 500))
      .onConflictDoUpdate({
        target: [macroObs.seriesId, macroObs.date],
        set: { value: sql`excluded.value` },
      });
  }
  return rows.length;
}

export interface StoredObservation {
  seriesId: string;
  date: string;
  value: number;
}

/** Observations for several series since a date, oldest first within a series. */
export async function dbSeriesObservations(
  ids: string[],
  sinceDays: number,
): Promise<StoredObservation[]> {
  return dbRead("dbSeriesObservations", async () => {
    const db = getDb();
    if (!db || ids.length === 0) return [];
    const since = new Date(Date.now() - sinceDays * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const rows = await db
      .select()
      .from(macroObs)
      .where(and(inArray(macroObs.seriesId, ids), gte(macroObs.date, since)))
      .orderBy(macroObs.seriesId, macroObs.date);
    const out: StoredObservation[] = [];
    for (const r of rows) {
      if (r.value === null) continue;
      out.push({ seriesId: r.seriesId, date: r.date, value: r.value });
    }
    return out;
  });
}

// ── Recaps ───────────────────────────────────────────────────────────────────

export interface StoredRecap {
  slug: string;
  kind: "session_open" | "session_close" | "weekly" | "instrument";
  bodyMd: string;
  inputs: unknown;
  templateVersion: string;
  generatedAt: string;
}

export async function persistRecap(r: Omit<StoredRecap, "generatedAt">): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db
    .insert(recaps)
    .values({
      slug: r.slug,
      kind: r.kind,
      bodyMd: r.bodyMd,
      inputs: r.inputs,
      templateVersion: r.templateVersion,
    })
    .onConflictDoUpdate({
      target: recaps.slug,
      set: {
        bodyMd: r.bodyMd,
        inputs: r.inputs,
        templateVersion: r.templateVersion,
        generatedAt: new Date(),
      },
    });
}

export async function dbRecentRecaps(limit = 30): Promise<StoredRecap[]> {
  return dbRead("dbRecentRecaps", async () => {
    const db = getDb();
    if (!db) return [];
    const rows = await db
      .select()
      .from(recaps)
      .orderBy(desc(recaps.generatedAt))
      .limit(limit);
    return rows.map((r) => ({
      slug: r.slug,
      kind: r.kind,
      bodyMd: r.bodyMd,
      inputs: r.inputs,
      templateVersion: r.templateVersion,
      generatedAt: r.generatedAt.toISOString(),
    }));
  });
}

export async function dbRecap(slug: string): Promise<StoredRecap | null> {
  return dbRead("dbRecap", async () => {
    const db = getDb();
    if (!db) return null;
    const [r] = await db.select().from(recaps).where(eq(recaps.slug, slug)).limit(1);
    if (!r) return null;
    return {
      slug: r.slug,
      kind: r.kind,
      bodyMd: r.bodyMd,
      inputs: r.inputs,
      templateVersion: r.templateVersion,
      generatedAt: r.generatedAt.toISOString(),
    };
  });
}
