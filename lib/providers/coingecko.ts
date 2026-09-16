import { z } from "zod";
import { swr } from "@/lib/cache/swr";
import { TTL } from "@/lib/cache/ttl";
import type {
  Candle,
  Capability,
  CompanyProfile,
  MarketDataProvider,
  ProviderBudget,
  Quote,
  Range,
  SymbolMatch,
} from "./types";

/**
 * CoinGecko — crypto prices, market caps (§6). Public tier ~30/min, no key.
 * Prices are already USD-native. The ONLY place CoinGecko fetch may target
 * the vendor.
 */
const BASE_URL = "https://api.coingecko.com/api/v3";

// Minimal symbol → CoinGecko id map. Extended from a committed list later.
const ID_MAP: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
};

const PriceResponse = z.record(
  z.string(),
  z.object({
    usd: z.number(),
    usd_24h_change: z.number().optional(),
    usd_market_cap: z.number().optional(),
  }),
);

export class CoinGeckoProvider implements MarketDataProvider {
  readonly id = "coingecko";
  readonly capabilities: readonly Capability[] = ["quote", "crypto"];
  readonly budget: ProviderBudget = { perMinute: 30 };

  isConfigured(): boolean {
    return true; // public tier needs no key
  }

  private resolveId(symbol: string): string | null {
    return ID_MAP[symbol.toUpperCase()] ?? null;
  }

  async quote(symbol: string): Promise<Quote | null> {
    const id = this.resolveId(symbol);
    if (!id) return null; // not a crypto we know — let the registry fail over
    const sym = symbol.toUpperCase();
    const { value } = await swr(`coingecko:quote:${id}`, TTL.cryptoPrice, async () => {
      const res = await fetch(
        `${BASE_URL}/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
      const parsed = PriceResponse.parse(await res.json());
      const row = parsed[id];
      if (!row) throw new Error(`CoinGecko: no data for ${id}`);
      const changePct = row.usd_24h_change ?? 0;
      const prev = row.usd / (1 + changePct / 100);
      const quote: Quote = {
        symbol: sym,
        priceUsd: row.usd,
        nativePrice: null,
        nativeCurrency: "USD",
        fxRateUsed: 1,
        change: row.usd - prev,
        changePct,
        open: null,
        high: null,
        low: null,
        prevClose: prev,
        volume: null,
        marketCapUsd: row.usd_market_cap ?? null,
        provider: this.id,
        dataDelayMinutes: 0,
        asOf: new Date().toISOString(),
      };
      return quote;
    });
    return value;
  }

  async candles(symbol: string, range: Range): Promise<Candle[]> {
    void symbol;
    void range;
    return [];
  }

  async profile(symbol: string): Promise<CompanyProfile | null> {
    void symbol;
    return null;
  }

  async search(q: string): Promise<SymbolMatch[]> {
    const upper = q.toUpperCase();
    return Object.keys(ID_MAP)
      .filter((sym) => sym.includes(upper))
      .map((sym) => ({
        symbol: sym,
        name: ID_MAP[sym] ?? sym,
        exchange: "crypto",
        assetClass: "crypto",
      }));
  }
}
