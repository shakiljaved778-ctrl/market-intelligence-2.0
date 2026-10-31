import Link from "next/link";

/**
 * Instrument chip — a bound ticker with its live change inline ("NVDA ▲1.2%"),
 * linking to /quote. Direction is carried by the glyph + sign as well as colour
 * (§12), so it reads with colour off and in colorblind-safe mode.
 */
export function InstrumentChip({
  symbol,
  changePct,
  className,
}: {
  symbol: string;
  changePct?: number | null;
  className?: string;
}) {
  const hasChange = typeof changePct === "number" && Number.isFinite(changePct);
  const dir = !hasChange
    ? "flat"
    : changePct! > 0
      ? "up"
      : changePct! < 0
        ? "down"
        : "flat";
  const glyph = dir === "up" ? "▲" : dir === "down" ? "▼" : "–";
  const sign =
    hasChange && changePct! > 0 ? "+" : hasChange && changePct! < 0 ? "−" : "";
  const color = dir === "up" ? "text-up" : dir === "down" ? "text-down" : "text-ink-3";

  return (
    <Link
      href={`/quote/${symbol}`}
      className={`border-hairline hover:border-hairline-strong text-ink-2 hover:text-ink inline-flex items-center gap-1.5 rounded-[4px] border px-1.5 py-0.5 text-[11px] transition-colors ${className ?? ""}`}
    >
      <span className="tnum font-medium">{symbol}</span>
      {hasChange ? (
        <span className={`tnum inline-flex items-center gap-0.5 ${color}`}>
          <span aria-hidden>{glyph}</span>
          {sign}
          {Math.abs(changePct!).toFixed(2)}%
        </span>
      ) : null}
    </Link>
  );
}
