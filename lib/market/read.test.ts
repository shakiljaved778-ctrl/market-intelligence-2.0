import { beforeEach, describe, expect, it } from "vitest";
import { __resetKvStoreForTests } from "@/lib/cache/store";
import { readCandles, readMovers, readQuote } from "./read";

describe("read layer (cache/DB/fixtures — never a vendor)", () => {
  beforeEach(() => __resetKvStoreForTests());

  it("falls back to fixtures for a known symbol with no cache/DB", async () => {
    const q = await readQuote("AAPL");
    expect(q?.provider).toBe("fixture");
    expect(q?.priceUsd).toBeGreaterThan(0);
  });

  it("returns null for an unknown symbol", async () => {
    expect(await readQuote("NOPE")).toBeNull();
  });

  it("produces reproducible fixture candles ending near the quote price", async () => {
    const a = await readCandles("AAPL", "1M");
    const b = await readCandles("AAPL", "1M");
    expect(a.length).toBeGreaterThan(0);
    expect(a).toEqual(b); // deterministic
    const q = await readQuote("AAPL");
    const lastClose = a.at(-1)?.c ?? 0;
    expect(Math.abs(lastClose - (q?.priceUsd ?? 0))).toBeLessThan(1);
  });

  it("ranks movers by absolute change", async () => {
    const movers = await readMovers(3);
    expect(movers).toHaveLength(3);
    for (let i = 1; i < movers.length; i += 1) {
      const prev = movers[i - 1];
      const cur = movers[i];
      if (!prev || !cur) continue;
      expect(Math.abs(prev.changePct)).toBeGreaterThanOrEqual(Math.abs(cur.changePct));
    }
  });
});
