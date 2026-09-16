import { rangeToWindow } from "@/lib/providers/range";
import type { Candle, Range } from "@/lib/providers/types";
import { universeBySymbol } from "./universe";

/**
 * Deterministic candle generator so charts render with ZERO keys (§2). A seeded
 * PRNG makes the series reproducible per symbol+range — no randomness at render.
 * Ends near the fixture's current price so the chart and the quote agree.
 */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function barCount(range: Range): number {
  switch (range) {
    case "1D":
      return 78; // ~5-min bars over a session
    case "5D":
      return 65;
    case "1M":
      return 22;
    case "6M":
      return 126;
    case "YTD":
      return 180;
    case "1Y":
      return 252;
    case "5Y":
      return 260; // weekly
  }
}

export function fixtureCandles(
  symbol: string,
  range: Range,
  now: Date = new Date(),
): Candle[] {
  const row = universeBySymbol(symbol);
  const end = row?.priceUsd ?? 100;
  const n = barCount(range);
  const w = rangeToWindow(range, now);
  const rand = seeded(hash(`${symbol}:${range}`));
  const stepMs = (w.to.getTime() - w.from.getTime()) / n;

  // Walk backwards from the current price with small seeded steps.
  const closes: number[] = [];
  let price = end;
  for (let i = 0; i < n; i += 1) {
    closes.push(price);
    const drift = (rand() - 0.5) * end * 0.01 * (w.intraday ? 0.3 : 1);
    price = Math.max(0.01, price - drift);
  }
  closes.reverse();

  return closes.map((c, i): Candle => {
    const o = i === 0 ? c : (closes[i - 1] ?? c);
    const spread = end * 0.004 * (0.5 + rand());
    return {
      t: new Date(w.from.getTime() + stepMs * i).toISOString(),
      o,
      h: Math.max(o, c) + spread,
      l: Math.min(o, c) - spread,
      c,
      v: Math.round(1_000_000 * (0.5 + rand())),
    };
  });
}
