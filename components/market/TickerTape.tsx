import Link from "next/link";
import { INDEX_STRIP } from "@/fixtures/indices";
import { directionGlyph, directionOf, formatPercent } from "@/lib/format/percent";
import { Sparkline, sparkSeries } from "@/components/ui/Sparkline";

/**
 * Ticker tape — a smooth CSS marquee of index levels, each with a 24-point
 * sparkline. Pauses on hover/focus; under prefers-reduced-motion it becomes a
 * static scrollable rail (handled in CSS). Index levels are currency-neutral
 * and never converted (§7); direction is paired with ▲/▼ + a sign (§12).
 *
 * The track renders the items twice for a seamless loop; the second copy is
 * aria-hidden and dropped when motion is reduced.
 */
function Item({ item }: { item: (typeof INDEX_STRIP)[number] }) {
  const dir = directionOf(item.change);
  const sd = dir === "gain" ? "up" : dir === "loss" ? "down" : "flat";
  const color = sd === "up" ? "text-up" : sd === "down" ? "text-down" : "text-ink-3";
  return (
    <span className="border-hairline flex shrink-0 items-center gap-2.5 border-r px-4 py-2">
      <span className="text-ink-2 text-[11px] font-medium">{item.name}</span>
      <span className="tnum text-ink text-[12px]">
        {item.level.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </span>
      <Sparkline
        values={sparkSeries(item.symbol, item.changePct)}
        dir={sd}
        width={44}
        height={16}
      />
      <span className={`tnum inline-flex items-center gap-0.5 text-[11px] ${color}`}>
        <span aria-hidden>{directionGlyph(item.change)}</span>
        {formatPercent(item.changePct)}
      </span>
    </span>
  );
}

export function TickerTape() {
  return (
    <div className="border-hairline bg-surface/80 border-b backdrop-blur">
      <div className="ticker-tape" aria-label="Index levels (illustrative sample)">
        <div className="ticker-track">
          <Link href="/markets" className="flex">
            {INDEX_STRIP.map((item) => (
              <Item key={item.symbol} item={item} />
            ))}
          </Link>
          <span className="flex" aria-hidden data-ticker-dup>
            {INDEX_STRIP.map((item) => (
              <Item key={`dup-${item.symbol}`} item={item} />
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}
