import { describe, expect, it } from "vitest";
import { delayLabel, provenanceOf, provenanceTitle } from "@/lib/market/provenance";
import type { Quote } from "@/lib/providers/types";

function quote(overrides: Partial<Quote>): Quote {
  return {
    symbol: "AAPL",
    priceUsd: 100,
    nativePrice: null,
    nativeCurrency: "USD",
    fxRateUsed: 1,
    change: 1,
    changePct: 1,
    open: null,
    high: null,
    low: null,
    prevClose: 99,
    volume: null,
    marketCapUsd: null,
    provider: "fixture",
    dataDelayMinutes: 0,
    asOf: "2026-09-18T14:32:00.000Z",
    ...overrides,
  };
}

describe("delayLabel", () => {
  it("labels real-time, delayed and end-of-day honestly", () => {
    expect(delayLabel(0)).toBeNull();
    expect(delayLabel(15)).toBe("delayed 15 min");
    expect(delayLabel(120)).toBe("delayed 2h");
    expect(delayLabel(1440)).toBe("end-of-day");
  });
});

describe("provenanceOf", () => {
  it("marks a fixture as a sample, never as live", () => {
    const p = provenanceOf(quote({ provider: "fixture" }));
    expect(p.live).toBe(false);
    expect(p.source).toBe("Sample data");
  });

  it("marks a vendor quote as live with a human source label", () => {
    const p = provenanceOf(quote({ provider: "finnhub", dataDelayMinutes: 15 }));
    expect(p.live).toBe(true);
    expect(p.source).toBe("Finnhub");
    expect(p.delay).toBe("delayed 15 min");
    expect(p.asOf).toContain("UTC");
  });
});

describe("provenanceTitle", () => {
  it("never presents a fixture as real market data", () => {
    expect(provenanceTitle(quote({ provider: "fixture" }))).toContain(
      "not live market data",
    );
  });

  it("states source and timing for a live quote", () => {
    const title = provenanceTitle(quote({ provider: "finnhub", dataDelayMinutes: 15 }));
    expect(title).toContain("Finnhub");
    expect(title).toContain("delayed 15 min");
  });
});
