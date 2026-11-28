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
 * Finnhub — primary equity quotes, profiles, search (§6). Free tier ~60/min.
 * The ONLY place Finnhub fetch may target the vendor. Native-currency prices
 * are converted to USD via Frankfurter and the rate used is recorded (§7).
 */
const BASE_URL = "https://finnhub.io/api/v1";

const QuoteResponse = z.object({
  c: z.number(), // current
  d: z.number().nullable(), // change
  dp: z.number().nullable(), // percent
  h: z.number(), // high
  l: z.number(), // low
  o: z.number(), // open
  pc: z.number(), // prev close
  t: z.number(), // unix ts
});

const ProfileResponse = z.object({
  name: z.string().optional(),
  exchange: z.string().optional(),
  finnhubIndustry: z.string().optional(),
  country: z.string().optional(),
  currency: z.string().optional(),
  marketCapitalization: z.number().optional(), // millions
});

const SearchResponse = z.object({
  result: z.array(
    z.object({
      symbol: z.string(),
      description: z.string(),
      type: z.string().optional(),
    }),
  ),
});

export class FinnhubProvider implements MarketDataProvider {
  readonly id = "finnhub";
  readonly capabilities: readonly Capability[] = [
    "quote",
    "profile",
    "search",
    "candles",
  ];
  readonly budget: ProviderBudget = { perMinute: 60 };

  isConfigured(): boolean {
    return Boolean(process.env.FINNHUB_API_KEY);
  }

  private key(): string {
    const k = process.env.FINNHUB_API_KEY;
    if (!k) throw new Error("FINNHUB_API_KEY not configured");
    return k;
  }

  async quote(symbol: string): Promise<Quote | null> {
    if (!this.isConfigured()) return null;
    const sym = symbol.toUpperCase();
    const { value } = await swr(`finnhub:quote:${sym}`, TTL.quoteLive, async () => {
      const res = await fetch(`${BASE_URL}/quote?symbol=${sym}&token=${this.key()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Finnhub quote ${res.status}`);
      const q = QuoteResponse.parse(await res.json());
      if (q.c === 0 && q.pc === 0) throw new Error(`Finnhub: unknown symbol ${sym}`);

      const profile = await this.profile(sym);
      const nativeCurrency = profile?.nativeCurrency ?? "USD";
      const fx = (await usdPerUnit(nativeCurrency)) ?? 1;
      const nativePrice = nativeCurrency === "USD" ? null : q.c;

      const quote: Quote = {
        symbol: sym,
        priceUsd: q.c * fx,
        nativePrice,
        nativeCurrency,
        fxRateUsed: fx,
        change: (q.d ?? 0) * fx,
        changePct: q.dp ?? 0, // percent is currency-neutral (§7)
        open: q.o,
        high: q.h,
        low: q.l,
        prevClose: q.pc,
        volume: null,
        marketCapUsd: profile?.marketCapUsd ?? null,
        provider: this.id,
        dataDelayMinutes: 0,
        asOf: new Date((q.t || Date.now() / 1000) * 1000).toISOString(),
      };
      return quote;
    });
    return value;
  }

  async profile(symbol: string): Promise<CompanyProfile | null> {
    if (!this.isConfigured()) return null;
    const sym = symbol.toUpperCase();
    const { value } = await swr(
      `finnhub:profile:${sym}`,
      TTL.fundamentals,
      async () => {
        const res = await fetch(
          `${BASE_URL}/stock/profile2?symbol=${sym}&token=${this.key()}`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error(`Finnhub profile ${res.status}`);
        const p = ProfileResponse.parse(await res.json());
        const currency = p.currency ?? "USD";
        const fx = (await usdPerUnit(currency)) ?? 1;
        const profile: CompanyProfile = {
          symbol: sym,
          name: p.name ?? sym,
          exchange: p.exchange ?? null,
          sector: p.finnhubIndustry ?? null,
          industry: p.finnhubIndustry ?? null,
          country: p.country ?? null,
          nativeCurrency: currency,
          // marketCapitalization is in millions of the reporting currency.
          marketCapUsd:
            p.marketCapitalization != null ? p.marketCapitalization * 1e6 * fx : null,
        };
        return profile;
      },
    );
    return value;
  }

  async candles(symbol: string, range: Range): Promise<Candle[]> {
    // Finnhub restricts historical candles on the free tier; Stooq backfill
    // (Phase 3) is the reliable path. Degrade to empty rather than error.
    void symbol;
    void range;
    return [];
  }

  async search(q: string): Promise<SymbolMatch[]> {
    if (!this.isConfigured()) return [];
    const { value } = await swr(
      `finnhub:search:${q.toLowerCase()}`,
      TTL.searchSymbol,
      async () => {
        const res = await fetch(
          `${BASE_URL}/search?q=${encodeURIComponent(q)}&token=${this.key()}`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error(`Finnhub search ${res.status}`);
        const parsed = SearchResponse.parse(await res.json());
        return parsed.result.slice(0, 20).map(
          (r): SymbolMatch => ({
            symbol: r.symbol,
            name: r.description,
            exchange: null,
            assetClass: "equity",
          }),
        );
      },
    );
    return value;
  }
}

/*
 * Earnings and IPO calendars (brief §5, 2026-11-28). Called only by the macro
 * job (never on page render), cached with an explicit TTL, validated with Zod.
 * A refusal (for example if the plan does not include an endpoint) returns
 * null and the page shows its empty state.
 */
const EarningsCalendarResponse = z.object({
  earningsCalendar: z.array(
    z.object({
      date: z.string(),
      symbol: z.string(),
      hour: z.string().nullish(),
      quarter: z.number().nullish(),
      year: z.number().nullish(),
      epsEstimate: z.number().nullish(),
      epsActual: z.number().nullish(),
      revenueEstimate: z.number().nullish(),
      revenueActual: z.number().nullish(),
    }),
  ),
});

const IpoCalendarResponse = z.object({
  ipoCalendar: z.array(
    z.object({
      date: z.string(),
      name: z.string().nullish(),
      symbol: z.string().nullish(),
      exchange: z.string().nullish(),
      price: z.string().nullish(),
      numberOfShares: z.number().nullish(),
      totalSharesValue: z.number().nullish(),
      status: z.string().nullish(),
    }),
  ),
});

export type EarningsEvent = z.infer<
  typeof EarningsCalendarResponse
>["earningsCalendar"][number];
export type IpoEvent = z.infer<typeof IpoCalendarResponse>["ipoCalendar"][number];

const CALENDAR_TTL_S = 6 * 60 * 60;

async function finnhubCalendar<T>(
  path: string,
  from: string,
  to: string,
  parse: (json: unknown) => T,
): Promise<T | null> {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return null;
  try {
    const { value } = await swr(
      `finnhub:${path}:${from}:${to}`,
      CALENDAR_TTL_S,
      async () => {
        const res = await fetch(
          `${BASE_URL}/${path}?from=${from}&to=${to}&token=${key}`,
          {
            cache: "no-store",
            signal: AbortSignal.timeout(10_000),
          },
        );
        if (!res.ok) throw new Error(`Finnhub ${path} ${res.status}`);
        return parse(await res.json());
      },
    );
    return value;
  } catch (err) {
    console.warn(
      `[finnhub] ${path} unavailable:`,
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

export function finnhubEarningsCalendar(
  from: string,
  to: string,
): Promise<EarningsEvent[] | null> {
  return finnhubCalendar(
    "calendar/earnings",
    from,
    to,
    (j) => EarningsCalendarResponse.parse(j).earningsCalendar,
  );
}

export function finnhubIpoCalendar(
  from: string,
  to: string,
): Promise<IpoEvent[] | null> {
  return finnhubCalendar(
    "calendar/ipo",
    from,
    to,
    (j) => IpoCalendarResponse.parse(j).ipoCalendar,
  );
}
