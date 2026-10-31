import Link from "next/link";

/**
 * Instrument chip — a bound ticker with its live change inline ("NVDA ▲1.2%"),
 * linking to /quote. Direction is carried by the glyph + sign as well as colour
 * (§12), so it reads with colour off and in colorblind-safe mode.
 */
export function InstrumentChip({
  symbol,
  changePct,
  asLink = true,
  className,
}: {
  symbol: string;
  changePct?: number | null;
  /** false renders a non-interactive span — use inside another link (e.g. a card). */
  asLink?: boolean;
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

  const inner = (
    <>
      <span className="tnum font-medium">{symbol}</span>
      {hasChange ? (
        <span className={`tnum inline-flex items-center gap-0.5 ${color}`}>
          <span aria-hidden>{glyph}</span>
          {sign}
          {Math.abs(changePct!).toFixed(2)}%
        </span>
      ) : null}
    </>
  );

  const base = `border-hairline text-ink-2 inline-flex items-center gap-1.5 rounded-[4px] border px-1.5 py-0.5 text-[11px] ${className ?? ""}`;

  if (!asLink) {
    return <span className={base}>{inner}</span>;
  }
  return (
    <Link
      href={`/quote/${symbol}`}
      className={`${base} hover:border-hairline-strong hover:text-ink transition-colors`}
    >
      {inner}
    </Link>
  );
}
