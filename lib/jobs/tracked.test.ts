import { describe, expect, it } from "vitest";
import { INDEX_TRACKERS } from "@/content/index-board";
import { instrumentBySymbol } from "@/content/instruments";
import { EQUITY_QUOTES_PER_RUN, TRACKED_SYMBOLS, quotesForRun } from "./tracked";

const isCrypto = (s: string) => instrumentBySymbol(s)?.assetClass === "crypto";
const pinned = INDEX_TRACKERS.map((t) => t.symbol);
const SLOT = 5 * 60_000;
const run = (slot: number) =>
  quotesForRun(TRACKED_SYMBOLS, { now: slot * SLOT, pinned, isCrypto });

describe("quotesForRun (2026-11-28: the end of the list went stale)", () => {
  it("stays inside the per-minute equity budget and always prices the index board", () => {
    for (let slot = 0; slot < 12; slot += 1) {
      const symbols = run(slot);
      expect(symbols.filter((s) => !isCrypto(s)).length).toBeLessThanOrEqual(
        EQUITY_QUOTES_PER_RUN,
      );
      for (const p of pinned) expect(symbols).toContain(p);
      expect(new Set(symbols).size).toBe(symbols.length);
    }
  });

  it("refreshes every tracked symbol within a few runs", () => {
    const seen = new Set<string>();
    for (let slot = 100; slot < 104; slot += 1) for (const s of run(slot)) seen.add(s);
    expect([...TRACKED_SYMBOLS].filter((s) => !seen.has(s))).toEqual([]);
  });

  it("always includes crypto, which has its own provider budget", () => {
    const crypto = TRACKED_SYMBOLS.filter(isCrypto);
    expect(crypto.length).toBeGreaterThan(0);
    for (const c of crypto) expect(run(7)).toContain(c);
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
