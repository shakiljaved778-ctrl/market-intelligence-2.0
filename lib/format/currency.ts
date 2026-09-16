import { convertFromUsd } from "@/lib/currency/convert";
import type { DisplayCurrency } from "@/lib/currency/peg";

/**
 * Format a USD-stored amount for display in USD or QAR (§7).
 * Display format: `$1,284.50` / `QR 4,675.58`. Always tabular-nums at the
 * call site (apply the `.tnum` class to the element).
 */
export function formatMoney(
  amountUsd: number,
  currency: DisplayCurrency,
  opts: { maximumFractionDigits?: number } = {},
): string {
  const value = convertFromUsd(amountUsd, currency);
  const digits = opts.maximumFractionDigits ?? 2;
  const num = value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return currency === "USD" ? `$${num}` : `QR ${num}`;
}

/**
 * Compact money for large figures like market cap — `$3.48T`, `$790.0B`,
 * `QR 22B`. Converts USD → display currency at the peg (§7). Returns `—` for
 * a null amount so callers can pass optional values straight through.
 */
export function formatCompactMoney(
  amountUsd: number | null,
  currency: DisplayCurrency,
): string {
  if (amountUsd === null) return "—";
  const v = convertFromUsd(amountUsd, currency);
  const unit = currency === "USD" ? "$" : "QR ";
  if (v >= 1e12) return `${unit}${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `${unit}${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${unit}${(v / 1e6).toFixed(0)}M`;
  return `${unit}${v.toFixed(0)}`;
}
