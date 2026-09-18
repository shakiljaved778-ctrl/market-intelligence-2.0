import { z } from "zod";

/**
 * Normalised internal types (§6). Every provider method returns one of these,
 * never a vendor's raw shape. Storage is always USD (§7).
 */

export const RangeSchema = z.enum(["1D", "5D", "1M", "6M", "YTD", "1Y", "5Y"]);
export type Range = z.infer<typeof RangeSchema>;

export const CapabilitySchema = z.enum([
  "quote",
  "candles",
  "profile",
  "search",
  "fundamentals",
  "fx",
  "crypto",
  "macro",
]);
export type Capability = z.infer<typeof CapabilitySchema>;

export const QuoteSchema = z.object({
  symbol: z.string(),
  /** Canonical price in USD. */
  priceUsd: z.number(),
  /** Native-currency price as quoted by the exchange, if not USD. */
  nativePrice: z.number().nullable(),
  nativeCurrency: z.string(),
  /** FX rate used to convert native → USD at fetch time (1 when native is USD). */
  fxRateUsed: z.number(),
  change: z.number(),
  changePct: z.number(),
  open: z.number().nullable(),
  high: z.number().nullable(),
  low: z.number().nullable(),
  prevClose: z.number().nullable(),
  volume: z.number().nullable(),
  marketCapUsd: z.number().nullable(),
  provider: z.string(),
  /** Delay in minutes; > 0 means the price must carry a delay label (§10). */
  dataDelayMinutes: z.number(),
  asOf: z.string(), // ISO timestamp
});
export type Quote = z.infer<typeof QuoteSchema>;

export const CandleSchema = z.object({
  t: z.string(), // ISO date/time
  o: z.number(),
  h: z.number(),
  l: z.number(),
  c: z.number(),
  v: z.number().nullable(),
});
export type Candle = z.infer<typeof CandleSchema>;

export const CompanyProfileSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  exchange: z.string().nullable(),
  sector: z.string().nullable(),
  industry: z.string().nullable(),
  country: z.string().nullable(),
  nativeCurrency: z.string(),
  marketCapUsd: z.number().nullable(),
});
export type CompanyProfile = z.infer<typeof CompanyProfileSchema>;

export const SymbolMatchSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  exchange: z.string().nullable(),
  assetClass: z.string(),
});
export type SymbolMatch = z.infer<typeof SymbolMatchSchema>;

/**
 * Trailing-twelve-month fundamentals for an instrument (§6). Valuation multiples
 * and ratios are dimensionless — never converted between currencies (§7).
 * Margins/yields are stored as decimals (0.25 = 25%). Every field is nullable
 * so a provider can answer with whatever it actually has.
 */
export const FundamentalsSchema = z.object({
  symbol: z.string(),
  peRatio: z.number().nullable(),
  pegRatio: z.number().nullable(),
  priceToSales: z.number().nullable(),
  priceToBook: z.number().nullable(),
  grossMargin: z.number().nullable(),
  operatingMargin: z.number().nullable(),
  netMargin: z.number().nullable(),
  returnOnEquity: z.number().nullable(),
  returnOnAssets: z.number().nullable(),
  debtToEquity: z.number().nullable(),
  currentRatio: z.number().nullable(),
  dividendYield: z.number().nullable(),
  payoutRatio: z.number().nullable(),
  provider: z.string(),
  asOf: z.string(), // ISO timestamp
});
export type Fundamentals = z.infer<typeof FundamentalsSchema>;

export interface ProviderBudget {
  perMinute?: number;
  perDay?: number;
}

/**
 * The provider contract (§6). Implementations live behind this and are the ONLY
 * place `fetch()` may target a third-party host. A method returns null when the
 * provider cannot answer (e.g. no key configured, or symbol unknown) so the
 * registry can fail over.
 */
export interface MarketDataProvider {
  readonly id: string;
  readonly capabilities: readonly Capability[];
  readonly budget: ProviderBudget;
  /** True when the provider has the credentials/config it needs to make calls. */
  isConfigured(): boolean;
  quote(symbol: string): Promise<Quote | null>;
  candles(symbol: string, range: Range): Promise<Candle[]>;
  profile(symbol: string): Promise<CompanyProfile | null>;
  search(q: string): Promise<SymbolMatch[]>;
  /**
   * Optional — only providers that declare the "fundamentals" capability
   * implement it. The registry guards on its presence.
   */
  fundamentals?(symbol: string): Promise<Fundamentals | null>;
}
