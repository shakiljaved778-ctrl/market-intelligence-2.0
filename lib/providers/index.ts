import { AlphaVantageProvider } from "./alphavantage";
import { CoinGeckoProvider } from "./coingecko";
import { EodhdProvider } from "./eodhd";
import { FinnhubProvider } from "./finnhub";
import { FixtureProvider } from "./fixture";
import { FmpProvider } from "./fmp";
import { PolygonProvider } from "./polygon";
import { ProviderRegistry } from "./registry";

/**
 * The registry, assembled in priority order (§6): configured live providers
 * first, the fixture provider last so there is always an answer with zero keys.
 * Each provider is skipped when its key is absent, so the order is safe
 * regardless of which subset of keys is configured.
 *
 * Quotes:  Finnhub → FMP → Polygon(EOD) → EODHD → CoinGecko(crypto)
 *          → AlphaVantage(last-resort) → fixture
 * Candles: Polygon → EODHD → AlphaVantage(daily) → fixture
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
  singleton = new ProviderRegistry([
    new FinnhubProvider(), // primary equities: quotes + profiles + search (60/min)
    new FmpProvider(), // fundamentals; quote/profile/search fallback (250/day)
    new PolygonProvider(), // EOD quotes + aggregate candles
    new EodhdProvider(), // EOD candle backfill + real-time fallback
    new CoinGeckoProvider(), // crypto
    new AlphaVantageProvider(), // last-resort equities fallback (tight free tier)
    new FixtureProvider(), // always-on fallback
  ]);
  return singleton;
}

export { ProviderRegistry } from "./registry";
