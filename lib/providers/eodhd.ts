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
 * EODHD (EOD Historical Data) — EOD candle backfill for the daily/weekly chart
 * ranges, and a real-time quote fallback. The ONLY place EODHD fetch may target
 * the vendor. Symbols are suffixed with an exchange (default `.US`).
 */
const BASE_URL = "https://eodhd.com/api";

const EodResponse = z.array(
  z.object({
    date: z.string(),
    open: z.number(),
    high: z.number(),
    low: z.number(),
    close: z.number(),
    adjusted_close: z.number().optional(),
    volume: z.number().optional(),
  }),
);

const RealTimeResponse = z.object({
  close: z.union([z.number(), z.string()]),
  open: z.union([z.number(), z.string()]).optional(),
  high: z.union([z.number(), z.string()]).optional(),
  low: z.union([z.number(), z.string()]).optional(),
  previousClose: z.union([z.number(), z.string()]).optional(),
  change: z.union([z.number(), z.string()]).optional(),
  change_p: z.union([z.number(), z.string()]).optional(),
  volume: z.union([z.number(), z.string()]).optional(),
});

function num(v: number | string | undefined): number | null {
  if (v === undefined) return null;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : null;
}

function withExchange(symbol: string): string {
  return symbol.includes(".") ? symbol.toUpperCase() : `${symbol.toUpperCase()}.US`;
}

export class EodhdProvider implements MarketDataProvider {
  readonly id = "eodhd";
  readonly capabilities: readonly Capability[] = ["candles", "quote"];
  readonly budget: ProviderBudget = { perDay: 100 };

  isConfigured(): boolean {
    return Boolean(process.env.EODHD_API_KEY);
  }

  private key(): string {
    const k = process.env.EODHD_API_KEY;
    if (!k) throw new Error("EODHD_API_KEY not configured");
    return k;
  }

  async candles(symbol: string, range: Range): Promise<Candle[]> {
    if (!this.isConfigured()) return [];
    const sym = withExchange(symbol);
    const w = rangeToWindow(range);
    // EODHD serves daily bars; intraday needs a different endpoint (deferred).
    if (w.intraday) return [];
    const { value } = await swr(
      `eodhd:candles:${sym}:${range}`,
      TTL.candlesDaily,
      async () => {
        const url = `${BASE_URL}/eod/${sym}?api_token=${this.key()}&fmt=json&from=${ymd(w.from)}&to=${ymd(w.to)}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`EODHD eod ${res.status}`);
        const rows = EodResponse.parse(await res.json());
        return rows.map(
          (r): Candle => ({
            t: new Date(`${r.date}T00:00:00.000Z`).toISOString(),
            o: r.open,
            h: r.high,
            l: r.low,
            c: r.close,
            v: r.volume ?? null,
          }),
        );
      },
    );
    return value;
  }

  async quote(symbol: string): Promise<Quote | null> {
    if (!this.isConfigured()) return null;
    const sym = withExchange(symbol);
    const { value } = await swr(`eodhd:quote:${sym}`, TTL.quoteClosed, async () => {
      const res = await fetch(
        `${BASE_URL}/real-time/${sym}?api_token=${this.key()}&fmt=json`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error(`EODHD real-time ${res.status}`);
      const r = RealTimeResponse.parse(await res.json());
      const close = num(r.close);
      if (close === null) return null;
      const quote: Quote = {
        symbol: symbol.toUpperCase(),
        priceUsd: close,
        nativePrice: null,
        nativeCurrency: "USD",
        fxRateUsed: 1,
        change: num(r.change) ?? 0,
        changePct: num(r.change_p) ?? 0,
        open: num(r.open),
        high: num(r.high),
        low: num(r.low),
        prevClose: num(r.previousClose),
        volume: num(r.volume),
        marketCapUsd: null,
        provider: this.id,
        dataDelayMinutes: 15,
        asOf: new Date().toISOString(),
      };
      return quote;
    });
    return value;
  }

  async profile(symbol: string): Promise<CompanyProfile | null> {
    void symbol;
    return null;
  }

  async search(q: string): Promise<SymbolMatch[]> {
    void q;
    return [];
  }
}
