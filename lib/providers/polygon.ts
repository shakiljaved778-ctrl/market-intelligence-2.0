import { z } from "zod";
import { swr } from "@/lib/cache/swr";
import { TTL } from "@/lib/cache/ttl";
import { rangeToWindow, ymd } from "./range";
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
 * Polygon.io — quotes (previous close on the free tier) and, primarily,
 * aggregate candles that back the chart ranges (§13). The ONLY place Polygon
 * fetch may target the vendor. US equities are USD-native.
 */
const BASE_URL = "https://api.polygon.io";

const PrevCloseResponse = z.object({
  results: z
    .array(
      z.object({
        c: z.number(),
        o: z.number(),
        h: z.number(),
        l: z.number(),
        v: z.number(),
      }),
    )
    .optional(),
});

const AggsResponse = z.object({
  results: z
    .array(
      z.object({
        t: z.number(),
        o: z.number(),
        h: z.number(),
        l: z.number(),
        c: z.number(),
        v: z.number().optional(),
      }),
    )
    .optional(),
});

const TickersResponse = z.object({
  results: z
    .array(
      z.object({
        ticker: z.string(),
        name: z.string().optional(),
        primary_exchange: z.string().optional(),
      }),
    )
    .optional(),
});

export class PolygonProvider implements MarketDataProvider {
  readonly id = "polygon";
  readonly capabilities: readonly Capability[] = ["quote", "candles", "search"];
  // Free tier ~5 req/min; batching + cache keep pages off the vendor entirely.
  readonly budget: ProviderBudget = { perMinute: 5 };

  isConfigured(): boolean {
    return Boolean(process.env.POLYGON_API_KEY);
  }

  private key(): string {
    const k = process.env.POLYGON_API_KEY;
    if (!k) throw new Error("POLYGON_API_KEY not configured");
    return k;
  }

  async quote(symbol: string): Promise<Quote | null> {
    if (!this.isConfigured()) return null;
    const sym = symbol.toUpperCase();
    const { value } = await swr(`polygon:quote:${sym}`, TTL.quoteClosed, async () => {
      const res = await fetch(
        `${BASE_URL}/v2/aggs/ticker/${sym}/prev?adjusted=true&apiKey=${this.key()}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error(`Polygon prev ${res.status}`);
      const parsed = PrevCloseResponse.parse(await res.json());
      const bar = parsed.results?.[0];
      if (!bar) return null;
      const change = bar.c - bar.o;
      const quote: Quote = {
        symbol: sym,
        priceUsd: bar.c,
        nativePrice: null,
        nativeCurrency: "USD",
        fxRateUsed: 1,
        change,
        changePct: bar.o !== 0 ? (change / bar.o) * 100 : 0,
        open: bar.o,
        high: bar.h,
        low: bar.l,
        prevClose: bar.o,
        volume: bar.v ?? null,
        marketCapUsd: null,
        provider: this.id,
        // Free tier serves end-of-day / delayed data — flag it (§10 delay label).
        dataDelayMinutes: 15,
        asOf: new Date().toISOString(),
      };
      return quote;
    });
    return value;
  }

  async candles(symbol: string, range: Range): Promise<Candle[]> {
    if (!this.isConfigured()) return [];
    const sym = symbol.toUpperCase();
    const w = rangeToWindow(range);
    const ttl = w.intraday ? TTL.candlesIntraday : TTL.candlesDaily;
    const { value } = await swr(`polygon:candles:${sym}:${range}`, ttl, async () => {
      const url =
        `${BASE_URL}/v2/aggs/ticker/${sym}/range/${w.multiplier}/${w.timespan}` +
        `/${ymd(w.from)}/${ymd(w.to)}?adjusted=true&sort=asc&limit=50000&apiKey=${this.key()}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`Polygon aggs ${res.status}`);
      const parsed = AggsResponse.parse(await res.json());
      return (parsed.results ?? []).map(
        (r): Candle => ({
          t: new Date(r.t).toISOString(),
          o: r.o,
          h: r.h,
          l: r.l,
          c: r.c,
          v: r.v ?? null,
        }),
      );
    });
    return value;
  }

  async profile(symbol: string): Promise<CompanyProfile | null> {
    void symbol;
    return null;
  }

  async search(q: string): Promise<SymbolMatch[]> {
    if (!this.isConfigured()) return [];
    const { value } = await swr(
      `polygon:search:${q.toLowerCase()}`,
      TTL.searchSymbol,
      async () => {
        const res = await fetch(
          `${BASE_URL}/v3/reference/tickers?search=${encodeURIComponent(q)}&active=true&limit=20&apiKey=${this.key()}`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error(`Polygon search ${res.status}`);
        const parsed = TickersResponse.parse(await res.json());
        return (parsed.results ?? []).map(
          (r): SymbolMatch => ({
            symbol: r.ticker,
            name: r.name ?? r.ticker,
            exchange: r.primary_exchange ?? null,
            assetClass: "equity",
          }),
        );
      },
    );
    return value;
  }
}
