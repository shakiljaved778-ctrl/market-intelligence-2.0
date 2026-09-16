import { describe, expect, it } from "vitest";
import type { Candle, Quote } from "@/lib/providers/types";
import { deriveInstrumentRecap } from "./derive";

function candle(t: string, c: number): Candle {
  return { t, o: c, h: c, l: c, c, v: null };
}

function quote(priceUsd: number, changePct: number): Quote {
  return {
    symbol: "X",
    priceUsd,
    nativePrice: null,
    nativeCurrency: "USD",
    fxRateUsed: 1,
    change: 0,
    changePct,
    open: null,
    high: null,
    low: null,
    prevClose: null,
    volume: null,
    marketCapUsd: null,
    provider: "fixture",
    dataDelayMinutes: 0,
    asOf: "2026-09-16T00:00:00.000Z",
  };
}

describe("deriveInstrumentRecap", () => {
  it("counts a consecutive declining streak from candles", () => {
    const closes = [80, 78, 76, 74]; // three straight declines
    const candles = closes.map((c, i) => candle(`2026-09-1${i}T00:00:00Z`, c));
    const d = deriveInstrumentRecap("X", "USD", quote(74, -2.6), candles);
    expect(d.streakShape).toBe("loss");
    expect(d.streakLength).toBe(3);
  });

  it("flags a new period low as an extremum", () => {
    const closes = [80, 82, 81, 83, 79]; // last is the lowest
    const candles = closes.map((c, i) => candle(`2026-09-1${i}T00:00:00Z`, c));
    const d = deriveInstrumentRecap("X", "USD", quote(79, -5), candles);
    expect(d.extremum?.kind).toBe("low");
  });

  it("detects a reversal", () => {
    const closes = [70, 72, 71]; // up then down
    const candles = closes.map((c, i) => candle(`2026-09-1${i}T00:00:00Z`, c));
    const d = deriveInstrumentRecap("X", "USD", quote(71, -1.4), candles);
    expect(d.reversed).toBe(true);
  });
});
