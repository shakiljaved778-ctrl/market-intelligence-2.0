import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetKvStoreForTests } from "@/lib/cache/store";
import { cachePut } from "@/lib/cache/swr";
import type { Quote } from "@/lib/providers/types";
import { coverageOf, readCandles, readMovers, readQuote, readUniverse } from "./read";
import {
  __resetQuoteMemo,
  getQuote,
  getSeries,
  isUsableQuote,
  priced,
} from "./service";

function quote(over: Partial<Quote>): Quote {
  return {
    symbol: "AAPL",
    priceUsd: 200,
    nativePrice: null,
    nativeCurrency: "USD",
    fxRateUsed: 1,
    change: 2,
    changePct: 1,
    open: null,
    high: null,
    low: null,
    prevClose: 198,
    volume: null,
    marketCapUsd: null,
    provider: "finnhub",
    dataDelayMinutes: 0,
    asOf: new Date().toISOString(),
    ...over,
  };
}

function reset() {
  __resetKvStoreForTests();
  __resetQuoteMemo();
}

describe("market read layer — PRODUCTION (no demo mode)", () => {
  beforeEach(() => {
    vi.stubEnv("DEMO_MODE", "");
    reset();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("shows NOTHING for a known symbol when no real quote is stored", async () => {
    // The old behaviour returned a fixture price labelled "sample". A reader
    // must never see an invented number, so the answer is now "unavailable".
    expect(await readQuote("AAPL")).toBeNull();
    const p = await getQuote("AAPL");
    expect(p.status).toBe("unavailable");
    expect(p.value).toBeNull();
    expect(p.source).toBeNull();
  });

  it("returns an empty universe, movers and series with nothing stored", async () => {
    expect(await readUniverse()).toEqual([]);
    expect(await readMovers(6)).toEqual([]);
    expect(await readCandles("AAPL", "1M")).toEqual([]);
    expect((await getSeries("AAPL", "1M")).status).toBe("unavailable");
  });

  it("serves a stored real quote with its source, time and delay", async () => {
    const asOf = new Date(Date.now() - 5 * 60_000).toISOString();
    await cachePut(
      "market:quote:AAPL",
      3600,
      quote({ provider: "fmp", dataDelayMinutes: 15, asOf }),
    );
    const p = await getQuote("AAPL");
    expect(p.value?.priceUsd).toBe(200);
    expect(p.source).toBe("fmp");
    expect(p.asOf).toBe(asOf);
    expect(p.delayMinutes).toBe(15);
    expect(p.demo).toBe(false);
  });

  it("never serves a stored FIXTURE quote as if it were real", async () => {
    await cachePut("market:quote:AAPL", 3600, quote({ provider: "fixture" }));
    expect((await getQuote("AAPL")).status).toBe("unavailable");
  });

  it("drops a quote that is too old to show", async () => {
    const sixDaysAgo = new Date(Date.now() - 6 * 86_400_000).toISOString();
    await cachePut("market:quote:AAPL", 3600, quote({ asOf: sixDaysAgo }));
    expect((await getQuote("AAPL")).status).toBe("unavailable");
  });

  it("reports coverage against the whole reference list", async () => {
    const c = coverageOf(await readUniverse());
    expect(c.priced).toBe(0);
    expect(c.total).toBeGreaterThan(100);
  });
});

describe("quote status and age rules", () => {
  it("labels a quote struck after the close as a last close (eod)", () => {
    // 21:00Z on a Wednesday in November = 16:00 in New York → the close.
    const p = priced(quote({ asOf: "2026-11-11T21:00:00.000Z" }));
    expect(p.status).toBe("eod");
  });

  it("labels an in-session quote ok", () => {
    // 16:00Z on a Wednesday in November = 11:00 in New York → open.
    const p = priced(quote({ asOf: "2026-11-11T16:00:00.000Z" }));
    expect(p.status).toBe("ok");
  });

  it("labels an end-of-day feed eod whatever the time", () => {
    const p = priced(
      quote({ asOf: "2026-11-11T16:00:00.000Z", dataDelayMinutes: 1440 }),
    );
    expect(p.status).toBe("eod");
  });

  it("allows an equity quote over a long weekend but not a week-old one", () => {
    const now = Date.parse("2026-11-16T12:00:00.000Z");
    expect(isUsableQuote(quote({ asOf: "2026-11-13T21:00:00.000Z" }), now)).toBe(true);
    expect(isUsableQuote(quote({ asOf: "2026-11-09T21:00:00.000Z" }), now)).toBe(false);
  });

  it("holds crypto to a 24-hour limit", () => {
    const now = Date.parse("2026-11-16T12:00:00.000Z");
    const btc = (asOf: string) => quote({ symbol: "BTC", asOf });
    expect(isUsableQuote(btc("2026-11-16T00:00:00.000Z"), now)).toBe(true);
    expect(isUsableQuote(btc("2026-11-15T06:00:00.000Z"), now)).toBe(false);
  });

  it("rejects a non-positive or non-finite price", () => {
    expect(isUsableQuote(quote({ priceUsd: 0 }))).toBe(false);
    expect(isUsableQuote(quote({ priceUsd: Number.NaN }))).toBe(false);
  });
});

describe("market read layer — DEMO MODE", () => {
  beforeEach(() => {
    vi.stubEnv("DEMO_MODE", "1");
    reset();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("serves sample values, always flagged as demo", async () => {
    const p = await getQuote("AAPL");
    expect(p.value?.priceUsd).toBeGreaterThan(0);
    expect(p.demo).toBe(true);
    expect(p.source).toBe("demo");
  });

  it("returns null for an unknown symbol", async () => {
    expect(await readQuote("NOPE")).toBeNull();
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

  it("prefers a stored real quote over the sample value", async () => {
    await cachePut("market:quote:AAPL", 3600, quote({ priceUsd: 321 }));
    // The universe read uses the stored map; the single read falls through to
    // the cache — both must return the real value, not the demo one.
    const p = await getQuote("AAPL");
    expect(p.value?.priceUsd).toBe(321);
    expect(p.demo).toBe(false);
  });
});
