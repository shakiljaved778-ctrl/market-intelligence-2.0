import { z } from "zod";
import { swr } from "@/lib/cache/swr";
import { TTL } from "@/lib/cache/ttl";
import { usdPerUnit } from "./frankfurter";
import { rangeToWindow } from "./range";
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
 * Alpha Vantage — last-resort quote / candle / profile / search fallback (§6).
 * The ONLY place an Alpha Vantage fetch may target the vendor. The free tier is
 * tight (≈25 calls/day, 5/min), so it sits LAST among the live providers and
 * every response is cached with an explicit TTL (§2). A rate-limit reply throws
 * so the registry's breaker trips and stops hammering the daily budget; an
 * unknown symbol returns null so the registry simply fails over.
 *
 * GLOBAL_QUOTE carries no currency, so quotes are treated as USD (Alpha Vantage
 * is used here as a US-equity fallback). OVERVIEW does carry a currency, so the
 * market cap is converted via Frankfurter and the rate recorded (§7).
 */
const BASE_URL = "https://www.alphavantage.co/query";

/** Shared shape for Alpha Vantage's throttle / error envelopes. */
const Envelope = {
  Note: z.string().optional(),
  Information: z.string().optional(),
  "Error Message": z.string().optional(),
};

const GlobalQuoteSchema = z.object({
  "Global Quote": z
    .object({
      "01. symbol": z.string().optional(),
      "02. open": z.string().optional(),
      "03. high": z.string().optional(),
      "04. low": z.string().optional(),
      "05. price": z.string().optional(),
      "06. volume": z.string().optional(),
      "08. previous close": z.string().optional(),
      "09. change": z.string().optional(),
      "10. change percent": z.string().optional(),
    })
    .optional(),
  ...Envelope,
});

const DailySchema = z.object({
  "Time Series (Daily)": z
    .record(
      z.string(),
      z.object({
        "1. open": z.string(),
        "2. high": z.string(),
        "3. low": z.string(),
        "4. close": z.string(),
        "5. volume": z.string(),
      }),
    )
    .optional(),
  ...Envelope,
});

const OverviewSchema = z.object({
  Name: z.string().optional(),
  Exchange: z.string().optional(),
  Sector: z.string().optional(),
  Industry: z.string().optional(),
  Country: z.string().optional(),
  Currency: z.string().optional(),
  MarketCapitalization: z.string().optional(),
  ...Envelope,
});

const SearchSchema = z.object({
  bestMatches: z
    .array(
      z.object({
        "1. symbol": z.string(),
        "2. name": z.string(),
        "3. type": z.string().optional(),
        "4. region": z.string().optional(),
      }),
    )
    .optional(),
  ...Envelope,
});

/** Parse a numeric string; NaN → null. */
function num(s: string | undefined): number | null {
  if (s == null) return null;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/** Throw on a throttle/error envelope so the breaker trips and we stop calling. */
function assertNotThrottled(env: {
  Note?: string;
  Information?: string;
  "Error Message"?: string;
}): void {
  if (env.Note) throw new Error(`Alpha Vantage rate limit: ${env.Note}`);
  if (env.Information) throw new Error(`Alpha Vantage: ${env.Information}`);
  if (env["Error Message"]) throw new Error(`Alpha Vantage: ${env["Error Message"]}`);
}

export class AlphaVantageProvider implements MarketDataProvider {
  readonly id = "alphavantage";
  readonly capabilities: readonly Capability[] = [
    "quote",
    "candles",
    "profile",
    "search",
  ];
  // Free tier: ~25/day, 5/min. Advisory — it sits last in the registry.
  readonly budget: ProviderBudget = { perMinute: 5, perDay: 25 };

  isConfigured(): boolean {
    return Boolean(process.env.ALPHAVANTAGE_API_KEY);
  }

  private key(): string {
    const k = process.env.ALPHAVANTAGE_API_KEY;
    if (!k) throw new Error("ALPHAVANTAGE_API_KEY not configured");
    return k;
  }

  async quote(symbol: string): Promise<Quote | null> {
    if (!this.isConfigured()) return null;
    const sym = symbol.toUpperCase();
    const { value } = await swr(`av:quote:${sym}`, TTL.quoteLive, async () => {
      const res = await fetch(
        `${BASE_URL}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(sym)}&apikey=${this.key()}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error(`Alpha Vantage quote ${res.status}`);
      const parsed = GlobalQuoteSchema.parse(await res.json());
      assertNotThrottled(parsed);
      const q = parsed["Global Quote"];
      const price = num(q?.["05. price"]);
      if (!q || price === null) return null; // unknown symbol → fail over

      const pctRaw = q["10. change percent"]?.replace("%", "");
      const quote: Quote = {
        symbol: sym,
        priceUsd: price,
        nativePrice: null,
        nativeCurrency: "USD",
        fxRateUsed: 1,
        change: num(q["09. change"]) ?? 0,
        changePct: pctRaw ? (num(pctRaw) ?? 0) : 0, // percent is currency-neutral (§7)
        open: num(q["02. open"]),
        high: num(q["03. high"]),
        low: num(q["04. low"]),
        prevClose: num(q["08. previous close"]),
        volume: num(q["06. volume"]),
        marketCapUsd: null,
        provider: this.id,
        dataDelayMinutes: 0,
        asOf: new Date().toISOString(),
      };
      return quote;
    });
    return value;
  }

  async candles(symbol: string, range: Range): Promise<Candle[]> {
    if (!this.isConfigured()) return [];
    const window = rangeToWindow(range);
    // Intraday ranges need a different endpoint + burn quota fast; skip them and
    // let a finer-grained provider answer (degrade to empty, not error).
    if (window.intraday) return [];

    const sym = symbol.toUpperCase();
    // 'compact' returns ~100 daily points; 'full' is needed for longer windows.
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 100);
    const outputsize = window.from < cutoff ? "full" : "compact";

    const { value } = await swr(
      `av:candles:${sym}:${range}`,
      TTL.candlesDaily,
      async () => {
        const res = await fetch(
          `${BASE_URL}?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(sym)}&outputsize=${outputsize}&apikey=${this.key()}`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error(`Alpha Vantage candles ${res.status}`);
        const parsed = DailySchema.parse(await res.json());
        assertNotThrottled(parsed);
        const series = parsed["Time Series (Daily)"];
        if (!series) return [];

        const candles: Candle[] = [];
        for (const [date, bar] of Object.entries(series)) {
          if (new Date(date) < window.from) continue;
          const o = num(bar["1. open"]);
          const h = num(bar["2. high"]);
          const l = num(bar["3. low"]);
          const c = num(bar["4. close"]);
          if (o === null || h === null || l === null || c === null) continue;
          candles.push({ t: date, o, h, l, c, v: num(bar["5. volume"]) });
        }
        candles.sort((a, b) => a.t.localeCompare(b.t));
        return candles;
      },
    );
    return value;
  }

  async profile(symbol: string): Promise<CompanyProfile | null> {
    if (!this.isConfigured()) return null;
    const sym = symbol.toUpperCase();
    const { value } = await swr(`av:profile:${sym}`, TTL.fundamentals, async () => {
      const res = await fetch(
        `${BASE_URL}?function=OVERVIEW&symbol=${encodeURIComponent(sym)}&apikey=${this.key()}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error(`Alpha Vantage overview ${res.status}`);
      const p = OverviewSchema.parse(await res.json());
      assertNotThrottled(p);
      if (!p.Name) return null; // unknown symbol → fail over

      const currency = p.Currency ?? "USD";
      const fx = (await usdPerUnit(currency)) ?? 1;
      const cap = num(p.MarketCapitalization);
      const profile: CompanyProfile = {
        symbol: sym,
        name: p.Name,
        exchange: p.Exchange ?? null,
        sector: p.Sector ?? null,
        industry: p.Industry ?? null,
        country: p.Country ?? null,
        nativeCurrency: currency,
        marketCapUsd: cap !== null ? cap * fx : null,
      };
      return profile;
    });
    return value;
  }

  async search(q: string): Promise<SymbolMatch[]> {
    if (!this.isConfigured()) return [];
    const { value } = await swr(
      `av:search:${q.toLowerCase()}`,
      TTL.searchSymbol,
      async () => {
        const res = await fetch(
          `${BASE_URL}?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(q)}&apikey=${this.key()}`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error(`Alpha Vantage search ${res.status}`);
        const parsed = SearchSchema.parse(await res.json());
        assertNotThrottled(parsed);
        return (parsed.bestMatches ?? []).slice(0, 20).map(
          (m): SymbolMatch => ({
            symbol: m["1. symbol"],
            name: m["2. name"],
            exchange: m["4. region"] ?? null,
            assetClass: "equity",
          }),
        );
      },
    );
    return value;
  }
}
