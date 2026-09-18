import { universeBySymbol } from "@/fixtures/universe";
import type { Fundamentals } from "@/lib/providers/types";

/**
 * Deterministic, illustrative fundamentals so the quote page's Financials
 * section renders with ZERO keys (§2). Values are seeded per symbol and shaped
 * by sector so they look plausible; they are clearly labelled as sample in the
 * UI (provider = "fixture") and are never presented as real (§10). Real data
 * comes from FMP once FMP_API_KEY is set. Crypto has no fundamentals → null.
 */

// Small FNV-1a → xorshift PRNG, seeded per symbol, for reproducible values.
function rng(seed: string): () => number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  let x = h >>> 0 || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    return x / 0xffffffff;
  };
}

// Rough per-sector centres for TTM ratios (illustrative only).
const SECTOR_SHAPE: Record<
  string,
  { pe: number; ps: number; pb: number; gross: number; net: number; roe: number }
> = {
  Technology: { pe: 32, ps: 8, pb: 12, gross: 0.6, net: 0.22, roe: 0.35 },
  "Communication Services": { pe: 24, ps: 5, pb: 6, gross: 0.55, net: 0.2, roe: 0.24 },
  "Health Care": { pe: 22, ps: 5, pb: 6, gross: 0.66, net: 0.18, roe: 0.26 },
  Financials: { pe: 13, ps: 3.5, pb: 1.6, gross: 0.0, net: 0.28, roe: 0.14 },
  "Consumer Discretionary": { pe: 26, ps: 2.5, pb: 8, gross: 0.4, net: 0.1, roe: 0.28 },
  "Consumer Staples": { pe: 23, ps: 2.6, pb: 7, gross: 0.42, net: 0.13, roe: 0.4 },
  Energy: { pe: 12, ps: 1.4, pb: 2, gross: 0.4, net: 0.11, roe: 0.18 },
  Industrials: { pe: 21, ps: 2.6, pb: 6, gross: 0.34, net: 0.12, roe: 0.25 },
  Materials: { pe: 16, ps: 2.4, pb: 3, gross: 0.3, net: 0.13, roe: 0.16 },
  Utilities: { pe: 19, ps: 2.8, pb: 2, gross: 0.5, net: 0.14, roe: 0.1 },
  "Real Estate": { pe: 34, ps: 7, pb: 2.4, gross: 0.6, net: 0.28, roe: 0.08 },
};

const DEFAULT_SHAPE = { pe: 20, ps: 3, pb: 4, gross: 0.4, net: 0.14, roe: 0.2 };

/** Illustrative fundamentals for an equity, or null for crypto/unknown symbols. */
export function fixtureFundamentals(symbol: string): Fundamentals | null {
  const row = universeBySymbol(symbol);
  if (!row || row.assetClass !== "equity") return null;

  const rand = rng(`fund:${row.symbol}`);
  const jitter = (centre: number, spread: number) =>
    Math.round(centre * (1 + (rand() - 0.5) * spread) * 100) / 100;

  const shape = (row.sector && SECTOR_SHAPE[row.sector]) || DEFAULT_SHAPE;
  const isFinancial = row.sector === "Financials";
  const netMargin = jitter(shape.net, 0.5);

  return {
    symbol: row.symbol,
    peRatio: jitter(shape.pe, 0.5),
    pegRatio: jitter(1.6, 0.6),
    priceToSales: jitter(shape.ps, 0.5),
    priceToBook: jitter(shape.pb, 0.5),
    grossMargin: isFinancial ? null : jitter(shape.gross, 0.2),
    operatingMargin: isFinancial ? null : jitter(netMargin * 1.35, 0.2),
    netMargin,
    returnOnEquity: jitter(shape.roe, 0.4),
    returnOnAssets: jitter(shape.roe * 0.45, 0.4),
    debtToEquity: jitter(isFinancial ? 1.8 : 0.7, 0.6),
    currentRatio: jitter(isFinancial ? 1.1 : 1.6, 0.4),
    dividendYield:
      row.sector === "Technology" ? jitter(0.006, 0.8) : jitter(0.022, 0.7),
    payoutRatio: jitter(0.35, 0.6),
    provider: "fixture",
    asOf: "2026-09-16T20:00:00.000Z",
  };
}
