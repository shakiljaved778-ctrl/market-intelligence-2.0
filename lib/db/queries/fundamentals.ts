import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { fundamentals, instruments } from "@/lib/db/schema";
import type { Fundamentals } from "@/lib/providers/types";

/**
 * Persist fetched fundamentals to Postgres (§6: fetched on a schedule, served
 * from cache). Ensures the instrument row exists for the FK, then records a
 * point-in-time snapshot. No-op with no DB.
 */
export async function persistFundamentals(f: Fundamentals): Promise<void> {
  const db = getDb();
  if (!db) return;

  await db
    .insert(instruments)
    .values({ symbol: f.symbol, name: f.symbol, assetClass: "equity" })
    .onConflictDoNothing();

  await db
    .insert(fundamentals)
    .values({
      symbol: f.symbol,
      ts: new Date(f.asOf),
      peRatio: f.peRatio,
      pegRatio: f.pegRatio,
      priceToSales: f.priceToSales,
      priceToBook: f.priceToBook,
      grossMargin: f.grossMargin,
      operatingMargin: f.operatingMargin,
      netMargin: f.netMargin,
      returnOnEquity: f.returnOnEquity,
      returnOnAssets: f.returnOnAssets,
      debtToEquity: f.debtToEquity,
      currentRatio: f.currentRatio,
      dividendYield: f.dividendYield,
      payoutRatio: f.payoutRatio,
      provider: f.provider,
    })
    .onConflictDoNothing();
}

/** Latest stored fundamentals for a symbol, or null when none/no DB. */
export async function dbLatestFundamentals(
  symbol: string,
): Promise<Fundamentals | null> {
  const db = getDb();
  if (!db) return null;
  const sym = symbol.toUpperCase();
  const [row] = await db
    .select()
    .from(fundamentals)
    .where(eq(fundamentals.symbol, sym))
    .orderBy(desc(fundamentals.ts))
    .limit(1);
  if (!row) return null;
  return {
    symbol: row.symbol,
    peRatio: row.peRatio,
    pegRatio: row.pegRatio,
    priceToSales: row.priceToSales,
    priceToBook: row.priceToBook,
    grossMargin: row.grossMargin,
    operatingMargin: row.operatingMargin,
    netMargin: row.netMargin,
    returnOnEquity: row.returnOnEquity,
    returnOnAssets: row.returnOnAssets,
    debtToEquity: row.debtToEquity,
    currentRatio: row.currentRatio,
    dividendYield: row.dividendYield,
    payoutRatio: row.payoutRatio,
    provider: row.provider,
    asOf: row.ts.toISOString(),
  };
}
