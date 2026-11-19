import { z } from "zod";
import { swr } from "@/lib/cache/swr";
import { TTL } from "@/lib/cache/ttl";
import { usdPerUnit } from "./frankfurter";
import { rangeToWindow, ymd } from "./range";
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
 * Financial Modeling Prep (FMP) — primary equity quotes, profiles, search (§6).
 * The ONLY place FMP fetch may target the vendor. Native-currency values are
 * converted to USD via Frankfurter and the rate used is recorded (§7).
 */
const BASE_URL = "https://financialmodelingprep.com/api/v3";
// FMP migrated to a new "stable" API; keys issued now work ONLY here, and the
// legacy /api/v3 endpoints return 403 for them. Stable uses ?symbol= query
// params and renamed a few fields (mapped defensively below).
const STABLE_URL = "https://financialmodelingprep.com/stable";

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

// FMP /ratios-ttm — trailing-twelve-month ratios (free tier). All optional; the
// vendor omits fields it can't compute. `.passthrough()` tolerates extra keys.
const RatiosTtmResponse = z.array(
  z
    .object({
      // v3 (legacy) names
      peRatioTTM: z.number().nullable().optional(),
      pegRatioTTM: z.number().nullable().optional(),
      debtEquityRatioTTM: z.number().nullable().optional(),
      dividendYielPercentageTTM: z.number().nullable().optional(),
      payoutRatioTTM: z.number().nullable().optional(),
      // stable names (current API)
      priceToEarningsRatioTTM: z.number().nullable().optional(),
      priceToEarningsGrowthRatioTTM: z.number().nullable().optional(),
      debtToEquityRatioTTM: z.number().nullable().optional(),
      dividendPayoutRatioTTM: z.number().nullable().optional(),
      // shared names
      priceToSalesRatioTTM: z.number().nullable().optional(),
      priceToBookRatioTTM: z.number().nullable().optional(),
      grossProfitMarginTTM: z.number().nullable().optional(),
      operatingProfitMarginTTM: z.number().nullable().optional(),
      netProfitMarginTTM: z.number().nullable().optional(),
      returnOnEquityTTM: z.number().nullable().optional(),
      returnOnAssetsTTM: z.number().nullable().optional(),
      currentRatioTTM: z.number().nullable().optional(),
      dividendYieldTTM: z.number().nullable().optional(),
    })
    .passthrough(),
);

export class FmpProvider implements MarketDataProvider {
  readonly id = "fmp";
  readonly capabilities: readonly Capability[] = [
    "quote",
    "profile",
    "search",
    "fundamentals",
    "candles",
  ];
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

  /**
   * TTM ratios from FMP's /ratios-ttm — rich (margins, ROE, leverage, yield) but
   * often gated on the free plan. Returns null on 402/403/empty so callers can
   * fall back rather than tripping the breaker.
   */
  private async ratiosTtm(sym: string): Promise<Partial<Fundamentals> | null> {
    const res = await fetch(
      `${STABLE_URL}/ratios-ttm?symbol=${sym}&apikey=${this.key()}`,
      { cache: "no-store" },
    );
    if (res.status === 402 || res.status === 403) return null;
    if (!res.ok) throw new Error(`FMP ratios-ttm ${res.status}`);
    const r = RatiosTtmResponse.parse(await res.json())[0];
    if (!r) return null;
    return {
      // Prefer stable field names, fall back to v3 names.
      peRatio: r.priceToEarningsRatioTTM ?? r.peRatioTTM ?? null,
      pegRatio: r.priceToEarningsGrowthRatioTTM ?? r.pegRatioTTM ?? null,
      priceToSales: r.priceToSalesRatioTTM ?? null,
      priceToBook: r.priceToBookRatioTTM ?? null,
      grossMargin: r.grossProfitMarginTTM ?? null,
      operatingMargin: r.operatingProfitMarginTTM ?? null,
      netMargin: r.netProfitMarginTTM ?? null,
      returnOnEquity: r.returnOnEquityTTM ?? null,
      returnOnAssets: r.returnOnAssetsTTM ?? null,
      debtToEquity: r.debtToEquityRatioTTM ?? r.debtEquityRatioTTM ?? null,
      currentRatio: r.currentRatioTTM ?? null,
      dividendYield: r.dividendYieldTTM ?? r.dividendYielPercentageTTM ?? null,
      payoutRatio: r.dividendPayoutRatioTTM ?? r.payoutRatioTTM ?? null,
    };
  }

  /** P/E from FMP's free stable /quote endpoint — the always-available fallback. */
  private async quotePe(sym: string): Promise<number | null> {
    const res = await fetch(`${STABLE_URL}/quote?symbol=${sym}&apikey=${this.key()}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const row = z
      .array(z.object({ pe: z.number().nullable().optional() }).passthrough())
      .parse(await res.json())[0];
    return row?.pe ?? null;
  }

  async fundamentals(symbol: string): Promise<Fundamentals | null> {
    if (!this.isConfigured()) return null;
    const sym = symbol.toUpperCase();
    const { value } = await swr(
      `fmp:fundamentals:${sym}`,
      TTL.fundamentals,
      async () => {
        // Rich ratios first (premium-gated), then the free /quote P/E fallback so we
        // still surface real data — clearly sourced — even on the strict free tier.
        const rich = await this.ratiosTtm(sym);
        const pe = rich?.peRatio ?? (await this.quotePe(sym));
        if (!rich && pe === null) return null;
        const fundamentals: Fundamentals = {
          symbol: sym,
          peRatio: pe,
          pegRatio: rich?.pegRatio ?? null,
          priceToSales: rich?.priceToSales ?? null,
          priceToBook: rich?.priceToBook ?? null,
          grossMargin: rich?.grossMargin ?? null,
          operatingMargin: rich?.operatingMargin ?? null,
          netMargin: rich?.netMargin ?? null,
          returnOnEquity: rich?.returnOnEquity ?? null,
          returnOnAssets: rich?.returnOnAssets ?? null,
          debtToEquity: rich?.debtToEquity ?? null,
          currentRatio: rich?.currentRatio ?? null,
          dividendYield: rich?.dividendYield ?? null,
          payoutRatio: rich?.payoutRatio ?? null,
          provider: this.id,
          asOf: new Date().toISOString(),
        };
        return fundamentals;
      },
    );
    return value;
  }

  /**
   * Daily OHLCV history from FMP's stable end-of-day endpoint (free tier, US
   * listings). Daily ranges only: FMP's free plan has no intraday bars, so 1D /
   * 5D return [] and the chart shows its empty state. The tracked symbols are
   * all US listings and US-listed ADRs, so the bars are already in USD (§7). A
   * plan-gated symbol (402/403) returns [] so the registry tries the next
   * provider without a penalty.
   */
  async candles(symbol: string, range: Range): Promise<Candle[]> {
    if (!this.isConfigured()) return [];
    const w = rangeToWindow(range);
    if (w.intraday) return [];
    const sym = symbol.toUpperCase();
    const url =
      `${STABLE_URL}/historical-price-eod/full?symbol=${encodeURIComponent(sym)}` +
      `&from=${ymd(w.from)}&to=${ymd(w.to)}&apikey=${this.key()}`;
    const res = await fetch(url, { cache: "no-store" });
    fmpHistoryStatus = res.status;
    if (res.status === 402 || res.status === 403 || res.status === 404) return [];
    if (!res.ok) throw new Error(`FMP historical-price-eod ${res.status}`);
    return parseEodBars(await res.json());
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

/** HTTP status of the last history request (for the EOD job's log line; no secrets). */
export let fmpHistoryStatus: number | null = null;

const EodBar = z
  .object({
    date: z.string(),
    open: z.number(),
    high: z.number(),
    low: z.number(),
    close: z.number(),
    volume: z.number().nullable().optional(),
  })
  .passthrough();

/**
 * FMP end-of-day rows → candles, oldest first. Accepts the stable shape (a flat
 * array) and the legacy one (`{ historical: [...] }`); anything else — e.g. an
 * `{ "Error Message": ... }` body for a plan-gated symbol — yields [].
 * Rows that do not parse are skipped, never invented.
 */
export function parseEodBars(body: unknown): Candle[] {
  const rows: unknown[] = Array.isArray(body)
    ? body
    : body &&
        typeof body === "object" &&
        Array.isArray((body as { historical?: unknown }).historical)
      ? (body as { historical: unknown[] }).historical
      : [];
  const out: Candle[] = [];
  for (const row of rows) {
    const r = EodBar.safeParse(row);
    if (!r.success) continue;
    const day = r.data.date.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    if (!(r.data.close > 0)) continue;
    out.push({
      t: `${day}T00:00:00.000Z`,
      o: r.data.open,
      h: r.data.high,
      l: r.data.low,
      c: r.data.close,
      v: r.data.volume ?? null,
    });
  }
  return out.sort((a, b) => a.t.localeCompare(b.t));
}
