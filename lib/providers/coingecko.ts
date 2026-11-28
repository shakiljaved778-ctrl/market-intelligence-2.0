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
  BNB: "binancecoin",
  TRX: "tron",
  LINK: "chainlink",
  DOT: "polkadot",
  AVAX: "avalanche-2",
  LTC: "litecoin",
  BCH: "bitcoin-cash",
  ATOM: "cosmos",
  UNI: "uniswap",
  NEAR: "near",
  APT: "aptos",
  ARB: "arbitrum",
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

  /**
   * Every coin in ONE request (2026-11-28). One call per coin sent 18 calls in
   * a burst, over the keyless tier's limit, so the last coins in the list
   * (APT, ARB, …) never got a price. The batch is cached like any other call,
   * and concurrent quotes in the same run share the request in flight.
   */
  private inflight: Promise<{
    at: string;
    prices: z.infer<typeof PriceResponse>;
  } | null> | null = null;

  private async allPrices(): Promise<{
    at: string;
    prices: z.infer<typeof PriceResponse>;
  } | null> {
    if (this.inflight) return this.inflight;
    const ids = [...new Set(Object.values(ID_MAP))].sort().join(",");
    this.inflight = swr(`coingecko:batch:v1`, TTL.cryptoPrice, async () => {
      const res = await fetch(
        `${BASE_URL}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`,
        { cache: "no-store", signal: AbortSignal.timeout(10_000) },
      );
      if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
      return {
        at: new Date().toISOString(),
        prices: PriceResponse.parse(await res.json()),
      };
    })
      .then((r) => r.value ?? null)
      .finally(() => {
        this.inflight = null;
      });
    return this.inflight;
  }

  async quote(symbol: string): Promise<Quote | null> {
    const id = this.resolveId(symbol);
    if (!id) return null; // not a crypto we know — let the registry fail over
    const sym = symbol.toUpperCase();
    const batch = await this.allPrices();
    const row = batch?.prices[id];
    if (!batch || !row) throw new Error(`CoinGecko: no data for ${id}`);
    const changePct = row.usd_24h_change ?? 0;
    const prev = row.usd / (1 + changePct / 100);
    return {
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
      asOf: batch.at,
    };
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
