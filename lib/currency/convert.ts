import { QAR_PER_USD, type DisplayCurrency } from "./peg";

/**
 * Convert a USD-denominated amount into the display currency.
 * Storage is always USD; this is presentation only (§7).
 *
 * IMPORTANT (§7, §17): percentages, ratios and index levels are
 * currency-neutral and must NEVER be passed through here. Use
 * `neutral()` for those — it is the identity and is unit-tested to stay so.
 */
export function convertFromUsd(amountUsd: number, to: DisplayCurrency): number {
  if (to === "USD") return amountUsd;
  return amountUsd * QAR_PER_USD;
}

/**
 * Currency-neutral values (percentages, ratios, index levels) pass through
 * unchanged regardless of display currency. This exists so the neutral rule
 * is explicit and testable rather than an accidental omission.
 */
export function neutral(value: number): number {
  return value;
}
