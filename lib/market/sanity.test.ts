import { describe, expect, it } from "vitest";
import type { Quote } from "@/lib/providers/types";
import {
  CONFIRM_TOLERANCE_PCT,
  OUTLIER_PCT_INDEX,
  sanitizeQuote,
  validateQuote,
} from "./sanity";

const NOW = Date.parse("2026-11-01T12:00:00.000Z");

function quote(overrides: Partial<Quote> = {}): Quote {
  return {
    symbol: "AAPL",
    priceUsd: 200,
    nativePrice: null,
    nativeCurrency: "USD",
    fxRateUsed: 1,
    change: 2,
    changePct: 1,
    open: 198,
    high: 201,
    low: 197,
    prevClose: 198,
    volume: 1_000_000,
    marketCapUsd: 3e12,
    provider: "finnhub",
    dataDelayMinutes: 15,
    asOf: "2026-11-01T11:50:00.000Z", // 10 min old
    ...overrides,
  };
}

describe("validateQuote", () => {
  it("accepts a fresh, in-range quote", () => {
    const r = validateQuote(quote(), { now: NOW });
    expect(r.ok).toBe(true);
    expect(r.quote?.priceUsd).toBe(200);
    expect(r.flagged).toBeUndefined();
  });

  it("rejects a null/zero/negative price and returns the last valid", () => {
    const last = quote({ priceUsd: 199 });
    for (const bad of [0, -5, Number.NaN]) {
      const r = validateQuote(quote({ priceUsd: bad }), { now: NOW, lastValid: last });
      expect(r.ok).toBe(false);
      expect(r.quote).toBe(last);
      expect(r.reason).toMatch(/price/);
    }
  });

  it("rejects a stale quote (older than delay + 24h grace)", () => {
    const stale = quote({ asOf: "2026-10-30T11:00:00.000Z" }); // ~49h old, delay 15m
    const r = validateQuote(stale, { now: NOW });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("stale");
    expect(r.quote).toBeNull();
  });

  it("keeps an EOD quote inside the delay + grace window", () => {
    // ~23h old with a 1-day (EOD) delay is still within delay + 24h grace.
    const eod = quote({ asOf: "2026-10-31T13:00:00.000Z", dataDelayMinutes: 0 });
    expect(validateQuote(eod, { now: NOW }).ok).toBe(true);
  });

  it("shows an outlier only when a second source confirms within tolerance", () => {
    const outlier = quote({ changePct: 22, priceUsd: 260 });
    // Confirmed: second source within 1%.
    const confirmed = validateQuote(outlier, {
      now: NOW,
      confirmPriceUsd: 260 * (1 + CONFIRM_TOLERANCE_PCT / 100 - 0.001),
    });
    expect(confirmed.ok).toBe(true);
    expect(confirmed.flagged).toBe(true);

    // Unconfirmed: no/odd second source → fall back to last valid, keep its stamp.
    const last = quote({ priceUsd: 213, asOf: "2026-10-31T20:00:00.000Z" });
    const unconfirmed = validateQuote(outlier, {
      now: NOW,
      confirmPriceUsd: 300, // >1% away
      lastValid: last,
    });
    expect(unconfirmed.ok).toBe(false);
    expect(unconfirmed.reason).toBe("unconfirmed_outlier");
    expect(unconfirmed.quote).toBe(last);
    expect(unconfirmed.quote?.asOf).toBe("2026-10-31T20:00:00.000Z");
  });

  it("uses the tighter 5% threshold for an index", () => {
    const idx = quote({ symbol: "SPX", changePct: 6 });
    const r = validateQuote(idx, { now: NOW, isIndex: true });
    expect(r.ok).toBe(false);
    expect(r.flagged).toBe(true);
    // The same move is fine for a stock (15% threshold).
    expect(validateQuote(quote({ changePct: 6 }), { now: NOW }).ok).toBe(true);
    expect(OUTLIER_PCT_INDEX).toBe(5);
  });
});

describe("sanitizeQuote", () => {
  it("passes null through and drops a bad quote to null", () => {
    expect(sanitizeQuote(null, { now: NOW })).toBeNull();
    expect(sanitizeQuote(quote({ priceUsd: 0 }), { now: NOW })).toBeNull();
    expect(sanitizeQuote(quote(), { now: NOW })?.symbol).toBe("AAPL");
  });
});
