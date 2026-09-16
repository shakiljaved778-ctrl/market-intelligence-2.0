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
 * Quotes:  FMP → Finnhub → Polygon(EOD) → EODHD → CoinGecko(crypto) → fixture
 * Candles: Polygon → EODHD → fixture
 * Search/profile resolve across whichever providers declare the capability.
 */
let singleton: ProviderRegistry | null = null;

export function getRegistry(): ProviderRegistry {
  if (singleton) return singleton;
  singleton = new ProviderRegistry([
    new FmpProvider(), // primary equities + profiles + search
    new FinnhubProvider(), // equities (if key present)
    new PolygonProvider(), // EOD quotes + aggregate candles
    new EodhdProvider(), // EOD candle backfill + real-time fallback
    new CoinGeckoProvider(), // crypto
    new FixtureProvider(), // always-on fallback
  ]);
  return singleton;
}

export { ProviderRegistry } from "./registry";
