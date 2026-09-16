import { z } from "zod";
import { swr } from "@/lib/cache/swr";
import { TTL } from "@/lib/cache/ttl";
import { usdPerUnit } from "./frankfurter";
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
 * Financial Modeling Prep (FMP) — primary equity quotes, profiles, search (§6).
 * The ONLY place FMP fetch may target the vendor. Native-currency values are
 * converted to USD via Frankfurter and the rate used is recorded (§7).
 */
const BASE_URL = "https://financialmodelingprep.com/api/v3";

const QuoteResponse = z.array(
  z.object({
    symbol: z.string(),
    price: z.number(),
    change: z.number().nullable().optional(),
    changesPercentage: z.number().nullable().optional(),
    open: z.number().nullable().optional(),
    dayHigh: z.number().nullable().optional(),
    dayLow: z.number().nullable().optional(),
    previousClose: z.number().nullable().optional(),
    volume: z.number().nullable().optional(),
    marketCap: z.number().nullable().optional(),
  }),
);

const ProfileResponse = z.array(
  z.object({
    companyName: z.string().optional(),
    exchangeShortName: z.string().optional(),
    industry: z.string().optional(),
    sector: z.string().optional(),
    country: z.string().optional(),
    currency: z.string().optional(),
    mktCap: z.number().nullable().optional(),
  }),
);

const SearchResponse = z.array(
  z.object({
    symbol: z.string(),
    name: z.string().optional(),
    exchangeShortName: z.string().optional(),
  }),
);

export class FmpProvider implements MarketDataProvider {
  readonly id = "fmp";
  readonly capabilities: readonly Capability[] = ["quote", "profile", "search"];
  // Free tier is ~250 req/day; scheduled batching + cache keep us well under.
  readonly budget: ProviderBudget = { perDay: 250 };

  isConfigured(): boolean {
    return Boolean(process.env.FMP_API_KEY);
  }

  private key(): string {
    const k = process.env.FMP_API_KEY;
    if (!k) throw new Error("FMP_API_KEY not configured");
    return k;
  }

  async quote(symbol: string): Promise<Quote | null> {
    if (!this.isConfigured()) return null;
    const sym = symbol.toUpperCase();
    const { value } = await swr(`fmp:quote:${sym}`, TTL.quoteLive, async () => {
      const res = await fetch(`${BASE_URL}/quote/${sym}?apikey=${this.key()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`FMP quote ${res.status}`);
      const rows = QuoteResponse.parse(await res.json());
      const row = rows[0];
      if (!row) return null;

      const profile = await this.profile(sym);
      const currency = profile?.nativeCurrency ?? "USD";
      const fx = (await usdPerUnit(currency)) ?? 1;

      const quote: Quote = {
        symbol: sym,
        priceUsd: row.price * fx,
        nativePrice: currency === "USD" ? null : row.price,
        nativeCurrency: currency,
        fxRateUsed: fx,
        change: (row.change ?? 0) * fx,
        changePct: row.changesPercentage ?? 0, // percent is currency-neutral (§7)
        open: row.open ?? null,
        high: row.dayHigh ?? null,
        low: row.dayLow ?? null,
        prevClose: row.previousClose ?? null,
        volume: row.volume ?? null,
        marketCapUsd: row.marketCap != null ? row.marketCap * fx : null,
        provider: this.id,
        dataDelayMinutes: 0,
        asOf: new Date().toISOString(),
      };
      return quote;
    });
    return value;
  }

  async profile(symbol: string): Promise<CompanyProfile | null> {
    if (!this.isConfigured()) return null;
    const sym = symbol.toUpperCase();
    const { value } = await swr(`fmp:profile:${sym}`, TTL.fundamentals, async () => {
      const res = await fetch(`${BASE_URL}/profile/${sym}?apikey=${this.key()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`FMP profile ${res.status}`);
      const rows = ProfileResponse.parse(await res.json());
      const p = rows[0];
      if (!p) return null;
      const currency = p.currency ?? "USD";
      const fx = (await usdPerUnit(currency)) ?? 1;
      const profile: CompanyProfile = {
        symbol: sym,
        name: p.companyName ?? sym,
        exchange: p.exchangeShortName ?? null,
        sector: p.sector ?? null,
        industry: p.industry ?? null,
        country: p.country ?? null,
        nativeCurrency: currency,
        marketCapUsd: p.mktCap != null ? p.mktCap * fx : null,
      };
      return profile;
    });
    return value;
  }

  async candles(symbol: string, range: Range): Promise<Candle[]> {
    void symbol;
    void range;
    return [];
  }

  async search(q: string): Promise<SymbolMatch[]> {
    if (!this.isConfigured()) return [];
    const { value } = await swr(
      `fmp:search:${q.toLowerCase()}`,
      TTL.searchSymbol,
      async () => {
        const res = await fetch(
          `${BASE_URL}/search?query=${encodeURIComponent(q)}&limit=20&apikey=${this.key()}`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error(`FMP search ${res.status}`);
        const rows = SearchResponse.parse(await res.json());
        return rows.map(
          (r): SymbolMatch => ({
            symbol: r.symbol,
            name: r.name ?? r.symbol,
            exchange: r.exchangeShortName ?? null,
            assetClass: "equity",
          }),
        );
      },
    );
    return value;
  }
}
