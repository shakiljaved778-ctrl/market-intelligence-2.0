import { desc, gte, sql } from "drizzle-orm";
import { instrumentBySymbol } from "@/content/instruments";
import { dbRead, getDb } from "@/lib/db/client";
import { instruments, quotes } from "@/lib/db/schema";
import type { Quote } from "@/lib/providers/types";

/**
 * Persist a fetched quote to Postgres (§6). Postgres is the durable
 * last-known-good store: the cache is only an accelerator, so a price survives
 * a cache expiry or a late job and can always state its source, time and delay.
 * Ensures the instrument row exists (reference data from content/instruments),
 * then records a point-in-time quote. No-op with no DB.
 */
export async function persistQuote(q: Quote): Promise<void> {
  const db = getDb();
  if (!db) return;

  const ref = instrumentBySymbol(q.symbol);
  await db
    .insert(instruments)
    .values({
      symbol: q.symbol,
      name: ref?.name ?? q.symbol,
      exchange: ref?.exchange ?? null,
      assetClass: ref?.assetClass ?? "equity",
      nativeCurrency: q.nativeCurrency,
      sector: ref?.sector ?? null,
      country: ref?.country ?? null,
      dataDelayMinutes: q.dataDelayMinutes,
    })
    .onConflictDoNothing();

  await db
    .insert(quotes)
    .values({
      symbol: q.symbol,
      ts: new Date(q.asOf),
      priceUsd: q.priceUsd,
      nativePrice: q.nativePrice,
      fxRateUsed: q.fxRateUsed,
      change: q.change,
      changePct: q.changePct,
      open: q.open,
      high: q.high,
      low: q.low,
      prevClose: q.prevClose,
      volume: q.volume,
      marketCapUsd: q.marketCapUsd,
      provider: q.provider,
      delayMinutes: q.dataDelayMinutes,
    })
    .onConflictDoNothing();
}

type QuoteRow = typeof quotes.$inferSelect;

function rowToQuote(row: QuoteRow, nativeCurrency: string): Quote {
  return {
    symbol: row.symbol,
    priceUsd: row.priceUsd,
    nativePrice: row.nativePrice,
    nativeCurrency,
    fxRateUsed: row.fxRateUsed,
    change: row.change ?? 0,
    changePct: row.changePct ?? 0,
    open: row.open,
    high: row.high,
    low: row.low,
    prevClose: row.prevClose,
    volume: row.volume,
    marketCapUsd: row.marketCapUsd,
    provider: row.provider,
    dataDelayMinutes: row.delayMinutes ?? 0,
    asOf: row.ts.toISOString(),
  };
}

/**
 * The latest stored quote for EVERY symbol, in one query (the pages render a
 * universe of ~120 instruments; one round-trip, not one per symbol). Only looks
 * back `sinceHours` — anything older is too stale to show anyway.
 */
async function latestQuotesQuery(sinceHours: number): Promise<Map<string, Quote>> {
  const out = new Map<string, Quote>();
  const db = getDb();
  if (!db) return out;
  const since = new Date(Date.now() - sinceHours * 3_600_000);
  const rows = await db
    .selectDistinctOn([quotes.symbol])
    .from(quotes)
    .where(gte(quotes.ts, since))
    .orderBy(quotes.symbol, desc(quotes.ts));
  if (rows.length === 0) return out;
  const inst = await db
    .select({
      symbol: instruments.symbol,
      nativeCurrency: instruments.nativeCurrency,
    })
    .from(instruments);
  const cur = new Map(inst.map((i) => [i.symbol, i.nativeCurrency]));
  for (const r of rows) out.set(r.symbol, rowToQuote(r, cur.get(r.symbol) ?? "USD"));
  return out;
}

/** Latest stored quote per symbol, for PAGE rendering (time-limited read). */
export async function dbLatestQuotes(sinceHours = 168): Promise<Map<string, Quote>> {
  return dbRead("dbLatestQuotes", () => latestQuotesQuery(sinceHours));
}

/** The same read for scheduled jobs, which are allowed to wait longer. */
export async function dbLatestQuotesForJob(
  sinceHours = 168,
): Promise<Map<string, Quote>> {
  return latestQuotesQuery(sinceHours);
}

/** Count of quote rows written in the last `hours` — a cheap feed-health probe. */
export async function dbQuoteCountSince(hours: number): Promise<number> {
  const db = getDb();
  if (!db) return 0;
  const since = new Date(Date.now() - hours * 3_600_000);
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(quotes)
    .where(gte(quotes.ts, since));
  return row?.n ?? 0;
}
