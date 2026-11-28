import { describe, expect, it } from "vitest";
import { INDEX_TRACKERS } from "@/content/index-board";
import { instrumentBySymbol } from "@/content/instruments";
import { EQUITY_QUOTES_PER_RUN, TRACKED_SYMBOLS, quotesForRun } from "./tracked";

const isCrypto = (s: string) => instrumentBySymbol(s)?.assetClass === "crypto";
const pinned = INDEX_TRACKERS.map((t) => t.symbol);
const run = (cursor: number) =>
  quotesForRun(TRACKED_SYMBOLS, { cursor, pinned, isCrypto });

describe("quotesForRun (2026-11-28: the end of the list went stale)", () => {
  it("stays inside the per-minute equity budget and always prices the index board", () => {
    for (const cursor of [0, 5, 33, 1000, -7]) {
      const { symbols } = run(cursor);
      expect(symbols.filter((s) => !isCrypto(s)).length).toBeLessThanOrEqual(
        EQUITY_QUOTES_PER_RUN,
      );
      for (const p of pinned) expect(symbols).toContain(p);
      expect(new Set(symbols).size).toBe(symbols.length);
    }
  });

  it("consecutive runs walk the whole list, whatever cursor they start from", () => {
    const equities = TRACKED_SYMBOLS.filter((s) => !isCrypto(s));
    const runsNeeded =
      Math.ceil(equities.length / (EQUITY_QUOTES_PER_RUN - pinned.length)) + 1;
    for (const first of [0, 17, 999]) {
      const seen = new Set<string>();
      let cursor = first;
      for (let i = 0; i < runsNeeded; i += 1) {
        const r = run(cursor);
        r.symbols.forEach((s) => seen.add(s));
        cursor = r.nextCursor;
      }
      expect([...TRACKED_SYMBOLS].filter((s) => !seen.has(s))).toEqual([]);
    }
  });

  it("always includes crypto, which has its own provider budget", () => {
    const crypto = TRACKED_SYMBOLS.filter(isCrypto);
    expect(crypto.length).toBeGreaterThan(0);
    for (const c of crypto) expect(run(7).symbols).toContain(c);
  });

  it("widened sectors: no tracked heatmap sector has fewer than five names", () => {
    const count: Record<string, number> = {};
    for (const s of TRACKED_SYMBOLS) {
      const i = instrumentBySymbol(s);
      if (i?.assetClass === "equity" && i.sector)
        count[i.sector] = (count[i.sector] ?? 0) + 1;
    }
    for (const [sector, n] of Object.entries(count))
      expect([sector, n >= 5]).toEqual([sector, true]);
  });
});
