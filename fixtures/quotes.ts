import type { Quote } from "@/lib/providers/types";

/**
 * Fixture quotes so the app renders and the quote API answers with ZERO keys
 * (§2 fixture mode). Prices are USD (§7). Values are illustrative and labelled
 * as fixtures in the UI.
 */
export const FIXTURE_QUOTES: Record<string, Quote> = {
  AAPL: {
    symbol: "AAPL",
    priceUsd: 229.87,
    nativePrice: null,
    nativeCurrency: "USD",
    fxRateUsed: 1,
    change: 1.42,
    changePct: 0.62,
    open: 228.1,
    high: 230.9,
    low: 227.6,
    prevClose: 228.45,
    volume: 41_230_000,
    marketCapUsd: 3_480_000_000_000,
    provider: "fixture",
    dataDelayMinutes: 0,
    asOf: "2026-09-16T20:00:00.000Z",
  },
  MSFT: {
    symbol: "MSFT",
    priceUsd: 421.33,
    nativePrice: null,
    nativeCurrency: "USD",
    fxRateUsed: 1,
    change: -2.11,
    changePct: -0.5,
    open: 423.5,
    high: 424.1,
    low: 420.2,
    prevClose: 423.44,
    volume: 18_900_000,
    marketCapUsd: 3_130_000_000_000,
    provider: "fixture",
    dataDelayMinutes: 0,
    asOf: "2026-09-16T20:00:00.000Z",
  },
  BTC: {
    symbol: "BTC",
    priceUsd: 63_412.0,
    nativePrice: null,
    nativeCurrency: "USD",
    fxRateUsed: 1,
    change: 812.0,
    changePct: 1.3,
    open: null,
    high: null,
    low: null,
    prevClose: 62_600.0,
    volume: null,
    marketCapUsd: 1_250_000_000_000,
    provider: "fixture",
    dataDelayMinutes: 0,
    asOf: "2026-09-16T20:00:00.000Z",
  },
};
