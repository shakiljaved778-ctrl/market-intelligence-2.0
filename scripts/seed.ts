import { getDb, isDbConfigured } from "@/lib/db/client";
import { instruments, macroSeries, sources } from "@/lib/db/schema";
import { FIXTURE_QUOTES } from "@/fixtures/quotes";

/**
 * Seed the database with a minimal set of instruments, sources and macro series
 * so the app has something to serve in development. No-ops gracefully when
 * POSTGRES_URL is not set (§2 fixture mode).
 *
 * Run: pnpm db:seed
 */
async function main(): Promise<void> {
  if (!isDbConfigured()) {
    console.log("[seed] POSTGRES_URL not set — skipping (app runs in fixture mode).");
    return;
  }
  const db = getDb();
  if (!db) return;

  const instrumentRows = Object.values(FIXTURE_QUOTES).map((q) => ({
    symbol: q.symbol,
    name: q.symbol,
    exchange: q.symbol === "BTC" ? "crypto" : "NASDAQ",
    assetClass: q.symbol === "BTC" ? "crypto" : "equity",
    nativeCurrency: q.nativeCurrency,
    dataDelayMinutes: 0,
    active: true,
  }));

  await db.insert(instruments).values(instrumentRows).onConflictDoNothing();

  await db
    .insert(sources)
    .values([
      {
        slug: "sec-edgar",
        name: "SEC EDGAR",
        homepage: "https://www.sec.gov",
        kind: "api" as const,
        tier: "regulator" as const,
        trustScore: 100,
        licenseNote: "US government primary source — public domain.",
        region: "US",
      },
      {
        slug: "fred",
        name: "Federal Reserve (FRED)",
        homepage: "https://fred.stlouisfed.org",
        kind: "api" as const,
        tier: "primary" as const,
        trustScore: 100,
        licenseNote: "St. Louis Fed — free API, attribution requested.",
        region: "US",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(macroSeries)
    .values([
      {
        id: "FRED:CPIAUCSL",
        name: "CPI, All Urban Consumers",
        unit: "Index 1982-84=100",
        frequency: "monthly",
        source: "FRED",
        region: "US",
      },
      {
        id: "FRED:UNRATE",
        name: "Unemployment Rate",
        unit: "Percent",
        frequency: "monthly",
        source: "FRED",
        region: "US",
      },
    ])
    .onConflictDoNothing();

  console.log(
    `[seed] inserted ${instrumentRows.length} instruments + sources + macro.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[seed] failed:", err);
    process.exit(1);
  });
