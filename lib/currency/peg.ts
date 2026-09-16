/**
 * QAR is pegged to USD (§7). This is an OFFICIAL PEG, not a floating rate.
 * Storage is always USD; QAR is a presentation-layer conversion.
 */
export const QAR_PER_USD = 3.64 as const;

/** When the peg was last reviewed against the official rate. */
export const pegReviewedOn = "2026-01-01" as const;

export type DisplayCurrency = "USD" | "QAR";

export const DEFAULT_CURRENCY: DisplayCurrency = "USD";

/** Name of the cookie Server Components read to render the right figures. */
export const CURRENCY_COOKIE = "mi_ccy" as const;

export function isDisplayCurrency(value: unknown): value is DisplayCurrency {
  return value === "USD" || value === "QAR";
}
