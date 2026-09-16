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
