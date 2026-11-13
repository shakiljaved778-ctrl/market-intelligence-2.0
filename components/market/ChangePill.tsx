/**
 * The one way a percentage move is drawn. Glyph, sign and colour are ALL
 * derived from the same number, so they can never disagree (the screener used
 * to take the glyph from one field and the figure from another). Direction is
 * carried by the glyph and the sign as well as colour (§12).
 */
export function ChangePill({
  pct,
  digits = 2,
  className = "",
}: {
  /** Percent change; null/undefined renders a neutral dash. */
  pct: number | null | undefined;
  digits?: number;
  className?: string;
}) {
  if (pct === null || pct === undefined || !Number.isFinite(pct)) {
    return <span className={`tnum text-ink-3 ${className}`}>—</span>;
  }
  // Classify on the ROUNDED value so "▲ +0.00%" can never be printed.
  const rounded = Number(pct.toFixed(digits));
  const dir = rounded > 0 ? "up" : rounded < 0 ? "down" : "flat";
  const color = dir === "up" ? "text-up" : dir === "down" ? "text-down" : "text-ink-3";
  const glyph = dir === "up" ? "▲" : dir === "down" ? "▼" : "–";
  const sign = dir === "up" ? "+" : dir === "down" ? "−" : "";
  return (
    <span className={`tnum inline-flex items-center gap-1 ${color} ${className}`}>
      <span aria-hidden>{glyph}</span>
      {sign}
      {Math.abs(rounded).toFixed(digits)}%
    </span>
  );
}

/** Direction of a rounded percentage, for sparkline / tile colouring. */
export function changeDir(
  pct: number | null | undefined,
  digits = 2,
): "up" | "down" | "flat" {
  if (pct === null || pct === undefined || !Number.isFinite(pct)) return "flat";
  const rounded = Number(pct.toFixed(digits));
  return rounded > 0 ? "up" : rounded < 0 ? "down" : "flat";
}
