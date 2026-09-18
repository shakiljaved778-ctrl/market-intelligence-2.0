import { describe, expect, it } from "vitest";
import { fixtureFundamentals } from "@/fixtures/fundamentals";
import { readFundamentals } from "@/lib/market/read";

describe("fixtureFundamentals", () => {
  it("returns illustrative, sample-labelled fundamentals for an equity", () => {
    const f = fixtureFundamentals("AAPL");
    expect(f).not.toBeNull();
    expect(f?.provider).toBe("fixture");
    expect(typeof f?.peRatio).toBe("number");
    expect(f?.netMargin).toBeGreaterThan(0);
  });

  it("is deterministic per symbol", () => {
    expect(fixtureFundamentals("MSFT")).toEqual(fixtureFundamentals("MSFT"));
  });

  it("has no fundamentals for crypto", () => {
    expect(fixtureFundamentals("BTC")).toBeNull();
  });

  it("omits equity-only margins for financials", () => {
    const jpm = fixtureFundamentals("JPM");
    expect(jpm?.grossMargin).toBeNull();
    expect(jpm?.netMargin).toBeGreaterThan(0);
  });
});

describe("readFundamentals", () => {
  it("falls back to the fixture with no cache/db and marks it sample", async () => {
    const f = await readFundamentals("AAPL");
    expect(f?.provider).toBe("fixture");
    expect(f?.peRatio).not.toBeNull();
  });

  it("returns null for a symbol with no fundamentals", async () => {
    expect(await readFundamentals("BTC")).toBeNull();
  });
});
