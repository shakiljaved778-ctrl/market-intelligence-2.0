import { cacheGet } from "@/lib/cache/swr";
import { demo } from "@/lib/demo/fixtures";
import type { StampInput } from "@/lib/market/provenance";

/**
 * GCC index levels (QSE, Tadawul, ADX, DFM) for the homepage and the tape.
 *
 * Shown ONLY when a real, licensed end-of-day feed has written them to the
 * store (`market:index:<symbol>`). No such feed is connected yet (see
 * docs/GCC-DATA-PROVIDERS.md), so in production this returns [] and the GCC
 * block does not render. Demo mode shows the committed sample levels, flagged.
 */
export interface IndexLevel {
  symbol: string;
  name: string;
  level: number;
  change: number;
  changePct: number;
  stamp: StampInput;
}

const GCC_INDICES: { symbol: string; name: string }[] = [
  { symbol: "DSM", name: "QSE Index" },
  { symbol: "TASI", name: "Tadawul All Share" },
  { symbol: "ADI", name: "ADX General" },
  { symbol: "DFMGI", name: "DFM General" },
];

interface StoredIndexLevel {
  level: number;
  change: number;
  changePct: number;
  asOf: string; // ISO
  source: string; // provider id
}

export async function readGccIndices(): Promise<IndexLevel[]> {
  const out: IndexLevel[] = [];
  for (const { symbol, name } of GCC_INDICES) {
    const real = await cacheGet<StoredIndexLevel>(`market:index:${symbol}`);
    if (!real || !Number.isFinite(real.level) || real.level <= 0) continue;
    out.push({
      symbol,
      name,
      level: real.level,
      change: real.change,
      changePct: real.changePct,
      stamp: { source: real.source, asOf: real.asOf, delayMinutes: 1440 },
    });
  }
  if (out.length > 0) return out;
  return demo
    .indexStrip()
    .filter((i) => i.region === "GCC")
    .map((i) => ({
      symbol: i.symbol,
      name: i.name,
      level: i.level,
      change: i.change,
      changePct: i.changePct,
      stamp: { source: "demo", asOf: null, demo: true },
    }));
}
