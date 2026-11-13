import { AlphaVantageProvider } from "./alphavantage";
import { CoinGeckoProvider } from "./coingecko";
import { EodhdProvider } from "./eodhd";
import { FinnhubProvider } from "./finnhub";
import { FixtureProvider } from "./fixture";
import { FmpProvider } from "./fmp";
import { PolygonProvider } from "./polygon";
import { isDemoMode } from "@/lib/demo/mode";
import { ProviderRegistry } from "./registry";
import type { MarketDataProvider } from "./types";

/**
 * The registry, assembled in priority order (§6): configured live providers
 * only. Each provider is skipped when its key is absent, so the order is safe
 * regardless of which subset of keys is configured. The fixture provider joins
 * ONLY under DEMO_MODE=1 — in production a symbol no real provider can answer
 * returns nothing, and the job stores nothing, so an invented price can never
 * be cached or persisted.
 *
 * Quotes:  Finnhub → FMP → Polygon(EOD) → EODHD → CoinGecko(crypto)
 *          → AlphaVantage(last-resort)
 * Candles: Polygon → EODHD → AlphaVantage(daily)
 * Fundamentals: FMP only (the sole provider that declares the capability).
 * Search/profile resolve across whichever providers declare the capability.
 *
 * Finnhub leads for quotes (60/min) so the every-5-min quotes job never spends
 * FMP's 250/day cap on the price firehose; FMP's daily budget is reserved for
 * low-frequency fundamentals (and it remains a quote/profile fallback).
 */
let singleton: ProviderRegistry | null = null;

export function getRegistry(): ProviderRegistry {
  if (singleton) return singleton;
  const providers: MarketDataProvider[] = [
    new FinnhubProvider(), // primary equities: quotes + profiles + search (60/min)
    new FmpProvider(), // fundamentals; quote/profile/search fallback (250/day)
    new PolygonProvider(), // EOD quotes + aggregate candles
    new EodhdProvider(), // EOD candle backfill + real-time fallback
    new CoinGeckoProvider(), // crypto
    new AlphaVantageProvider(), // last-resort equities fallback (tight free tier)
  ];
  if (isDemoMode()) providers.push(new FixtureProvider()); // demo only
  singleton = new ProviderRegistry(providers);
  return singleton;
}

export { ProviderRegistry } from "./registry";
