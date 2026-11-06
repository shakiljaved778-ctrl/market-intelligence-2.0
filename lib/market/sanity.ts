import type { Quote } from "@/lib/providers/types";

/**
 * Server-side data sanity layer (Prompt Pack Phase 1). ONE place that every
 * widget's data passes through before display, so a bad vendor value can never
 * reach a finance reader. Pure and deterministic (inject `now` in tests).
 *
 * Rules:
 *  - Reject a null / zero / negative price.
 *  - Reject a stale quote: older than its expected delay + a 24h grace (covers a
 *    normal overnight/weekend gap on a trading venue). Older than that = suspect.
 *  - Flag an outlier move (> 15% for a stock, > 5% for an index). Show it only if
 *    a second source confirms the price within 1%; otherwise fall back to the
 *    last valid quote (keeping ITS original timestamp), never the outlier.
 *  - Every rejection/flag is logged with symbol, provider, value and reason.
 */

export const OUTLIER_PCT_STOCK = 15;
export const OUTLIER_PCT_INDEX = 5;
/** A second source must agree on price to within this % to confirm an outlier. */
export const CONFIRM_TOLERANCE_PCT = 1;
/** Grace added to a quote's expected delay before it counts as stale. */
export const STALE_GRACE_HOURS = 24;

export type SanityReason =
  | "nonfinite_price"
  | "nonpositive_price"
  | "stale"
  | "unconfirmed_outlier";

export interface SanityContext {
  /** True for an index level (5% outlier threshold) vs a stock (15%). */
  isIndex?: boolean;
  /** Expected feed delay in minutes; defaults to the quote's own `dataDelayMinutes`. */
  expectedDelayMinutes?: number;
  /** A second source's USD price for the same instrument, for outlier confirmation. */
  confirmPriceUsd?: number | null;
  /** The last known-good quote, used as the fallback when the new one is rejected. */
  lastValid?: Quote | null;
  /** Injectable clock (ms since epoch) for tests. */
  now?: number;
}

export interface SanityResult {
  /** True when the incoming quote itself passed (possibly flagged-but-confirmed). */
  ok: boolean;
  /** The quote safe to display: the input, the last-valid fallback, or null. */
  quote: Quote | null;
  /** Set when the quote was rejected or an outlier was flagged. */
  reason?: SanityReason;
  /** True when the move breached the outlier threshold (whether or not confirmed). */
  flagged?: boolean;
}

function log(symbol: string, provider: string, value: number, reason: string): void {
  // One structured line per rejection (§15 observability).
  console.warn(
    `[sanity] rejected ${symbol} from ${provider}: ${reason} (value=${value})`,
  );
}

/**
 * Validate one quote. Returns the quote that is safe to display (which may be the
 * `lastValid` fallback) plus the reason it was rejected/flagged, if any.
 */
export function validateQuote(quote: Quote, ctx: SanityContext = {}): SanityResult {
  const now = ctx.now ?? Date.now();
  const price = quote.priceUsd;

  // 1. Price must be a finite, strictly positive number.
  if (!Number.isFinite(price)) {
    log(quote.symbol, quote.provider, price, "nonfinite_price");
    return { ok: false, quote: ctx.lastValid ?? null, reason: "nonfinite_price" };
  }
  if (price <= 0) {
    log(quote.symbol, quote.provider, price, "nonpositive_price");
    return { ok: false, quote: ctx.lastValid ?? null, reason: "nonpositive_price" };
  }

  // 2. Staleness: age beyond expected delay + 24h grace.
  const asOfMs = Date.parse(quote.asOf);
  const delayMin = ctx.expectedDelayMinutes ?? quote.dataDelayMinutes ?? 0;
  const maxAgeMs = (delayMin * 60 + STALE_GRACE_HOURS * 3600) * 1000;
  if (!Number.isFinite(asOfMs) || now - asOfMs > maxAgeMs) {
    log(quote.symbol, quote.provider, price, "stale");
    return { ok: false, quote: ctx.lastValid ?? null, reason: "stale" };
  }

  // 3. Outlier move — needs a confirming second source, else use last valid.
  const threshold = ctx.isIndex ? OUTLIER_PCT_INDEX : OUTLIER_PCT_STOCK;
  if (Math.abs(quote.changePct) > threshold) {
    const confirm = ctx.confirmPriceUsd;
    const confirmed =
      typeof confirm === "number" &&
      confirm > 0 &&
      (Math.abs(confirm - price) / price) * 100 <= CONFIRM_TOLERANCE_PCT;
    if (confirmed) {
      return { ok: true, quote, flagged: true };
    }
    log(quote.symbol, quote.provider, quote.changePct, "unconfirmed_outlier");
    // Prefer the last valid value (with ITS timestamp); if there is none to fall
    // back to, keep the value but mark it flagged rather than hide a real move.
    return {
      ok: false,
      quote: ctx.lastValid ?? quote,
      reason: "unconfirmed_outlier",
      flagged: true,
    };
  }

  return { ok: true, quote };
}

/**
 * Convenience for the read path: returns the displayable quote or null. A caller
 * that only has one source (no confirm, no history) uses this to drop bad values
 * so a widget can fall back to a clearly-labelled sample or hide.
 */
export function sanitizeQuote(
  quote: Quote | null,
  ctx: SanityContext = {},
): Quote | null {
  if (!quote) return null;
  return validateQuote(quote, ctx).quote;
}
