/**
 * Percentages are currency-neutral (§7) — never converted. This formatter
 * carries the sign explicitly so direction never rests on colour alone (§12).
 */
export function formatPercent(pct: number, opts: { digits?: number } = {}): string {
  const digits = opts.digits ?? 2;
  const sign = pct > 0 ? "+" : pct < 0 ? "−" : "";
  return `${sign}${Math.abs(pct).toFixed(digits)}%`;
}

/** Direction glyph — pairs with colour, and stands alone under reduced motion. */
export function directionGlyph(change: number): "▲" | "▼" | "–" {
  if (change > 0) return "▲"; // ▲
  if (change < 0) return "▼"; // ▼
  return "–"; // –
}

export type Direction = "gain" | "loss" | "flat";

export function directionOf(change: number): Direction {
  if (change > 0) return "gain";
  if (change < 0) return "loss";
  return "flat";
}
