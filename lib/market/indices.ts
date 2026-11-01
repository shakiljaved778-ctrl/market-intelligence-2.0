import { getKvStore } from "@/lib/cache/store";
import type { IndexStripItem } from "@/fixtures/indices";

/**
 * GCC index levels (QSE, Tadawul, ADX, DFM) for the homepage spotlight.
 *
 * Phase 1 data-integrity rule (§3): show ONLY real, sourced end-of-day values —
 * never the illustrative fixtures. Values come from the cache the EOD job primes
 * (`market:index:<symbol>`) once a provider that actually returns these indices
 * is wired. Until then this returns [] (and warns once) so the spotlight HIDES
 * rather than display invented numbers.
 */
const GCC_INDICES: { symbol: string; name: string }[] = [
  { symbol: "DSM", name: "QSE Index" },
  { symbol: "TASI", name: "Tadawul" },
  { symbol: "ADI", name: "ADX General" },
  { symbol: "DFMGI", name: "DFM General" },
];

interface RealIndexLevel {
  level: number;
  change: number;
  changePct: number;
  asOf: string; // ISO
  source: string; // provider id
}

let warned = false;

async function kvGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await getKvStore().get(key);
    if (!raw) return null;
    return (JSON.parse(raw) as { v: T }).v ?? null;
  } catch {
    return null;
  }
}

export async function readGccIndices(): Promise<IndexStripItem[]> {
  const out: IndexStripItem[] = [];
  for (const { symbol, name } of GCC_INDICES) {
    const real = await kvGet<RealIndexLevel>(`market:index:${symbol}`);
    if (!real || !Number.isFinite(real.level) || real.level <= 0) continue;
    out.push({
      symbol,
      name,
      level: real.level,
      change: real.change,
      changePct: real.changePct,
      region: "GCC",
      delayLabel: `EOD · ${real.source}`,
    });
  }
  if (out.length === 0 && !warned) {
    warned = true;
    console.warn(
      "[indices] no real GCC index source configured — GCC spotlight hidden",
    );
  }
  return out;
}
