import { CoinGeckoProvider } from "./coingecko";
import { FinnhubProvider } from "./finnhub";
import { FixtureProvider } from "./fixture";
import { ProviderRegistry } from "./registry";

/**
 * The registry, assembled in priority order (§6): configured live providers
 * first, the fixture provider last so there is always an answer with zero keys.
 */
let singleton: ProviderRegistry | null = null;

export function getRegistry(): ProviderRegistry {
  if (singleton) return singleton;
  singleton = new ProviderRegistry([
    new FinnhubProvider(), // primary equities (skipped when unconfigured)
    new CoinGeckoProvider(), // crypto
    new FixtureProvider(), // always-on fallback
  ]);
  return singleton;
}

export { ProviderRegistry } from "./registry";
