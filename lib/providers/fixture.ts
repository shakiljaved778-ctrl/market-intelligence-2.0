import { FIXTURE_QUOTES } from "@/fixtures/quotes";
import { fixtureFundamentals } from "@/fixtures/fundamentals";
import type {
  Candle,
  Capability,
  CompanyProfile,
  Fundamentals,
  MarketDataProvider,
  ProviderBudget,
  Quote,
  Range,
  SymbolMatch,
} from "./types";

/**
 * Fixture provider — always configured, lowest priority. Guarantees the app
 * boots and the quote API answers with ZERO keys (§2). Real providers, when
 * configured, sit ahead of it in the registry and take precedence.
 */
export class FixtureProvider implements MarketDataProvider {
  readonly id = "fixture";
  readonly capabilities: readonly Capability[] = [
    "quote",
    "profile",
    "search",
    "fundamentals",
  ];
  readonly budget: ProviderBudget = {};

  isConfigured(): boolean {
    return true;
  }

  async quote(symbol: string): Promise<Quote | null> {
    return FIXTURE_QUOTES[symbol.toUpperCase()] ?? null;
  }

  async candles(symbol: string, range: Range): Promise<Candle[]> {
    void symbol;
    void range;
    return [];
  }

  async profile(symbol: string): Promise<CompanyProfile | null> {
    const q = FIXTURE_QUOTES[symbol.toUpperCase()];
    if (!q) return null;
    return {
      symbol: q.symbol,
      name: q.symbol,
      exchange: null,
      sector: null,
      industry: null,
      country: null,
      nativeCurrency: q.nativeCurrency,
      marketCapUsd: q.marketCapUsd,
    };
  }

  async search(q: string): Promise<SymbolMatch[]> {
    const upper = q.toUpperCase();
    return Object.keys(FIXTURE_QUOTES)
      .filter((s) => s.includes(upper))
      .map((s) => ({ symbol: s, name: s, exchange: null, assetClass: "equity" }));
  }

  async fundamentals(symbol: string): Promise<Fundamentals | null> {
    return fixtureFundamentals(symbol);
  }
}
