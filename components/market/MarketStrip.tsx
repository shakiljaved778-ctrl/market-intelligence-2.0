import { INDEX_STRIP } from "@/fixtures/indices";
import { directionGlyph, directionOf, formatPercent } from "@/lib/format/percent";

/**
 * Session-aware index strip (§12, §13). Index levels are currency-neutral and
 * are never converted (§7). On phones it is a horizontally scrollable rail with a
 * right-edge fade so it's clearly swipeable (all indices reachable, none hidden
 * without an affordance). Radius 0 on data strips (§12). Colour is paired with
 * ▲/▼ and a sign — never colour alone.
 */
export function MarketStrip() {
  return (
    <div className="border-line bg-surface/70 relative border-b backdrop-blur">
      <div
        aria-label="Index levels"
        className="scrollbar-none flex snap-x items-stretch overflow-x-auto"
      >
        {INDEX_STRIP.map((item) => {
          const dir = directionOf(item.change);
          const dirClass =
            dir === "gain"
              ? "dir-gain bg-gain/10"
              : dir === "loss"
                ? "dir-loss bg-loss/10"
                : "text-text-mid bg-surface";
          return (
            <div
              key={item.symbol}
              className="border-line hover:bg-raised/60 flex shrink-0 snap-start flex-col gap-1 border-r px-3 py-2 transition-colors sm:px-4 sm:py-2.5"
            >
              <div className="flex items-center gap-2">
                <span className="text-text-mid text-[11px] font-medium tracking-wide">
                  {item.name}
                </span>
                {item.delayLabel ? (
                  <span className="text-text-low text-[10px]">{item.delayLabel}</span>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <span className="tnum text-text-hi text-[13px] sm:text-[14px]">
                  {item.level.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span
                  className={`tnum flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] ${dirClass}`}
                >
                  <span aria-hidden>{directionGlyph(item.change)}</span>
                  {formatPercent(item.changePct)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Right-edge fade — a quiet "swipe for more" affordance so the off-screen
          indices are discoverable (§12: chrome, not data). Hidden once the rail
          fits from lg up. */}
      <div
        aria-hidden
        className="from-canvas pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l to-transparent lg:hidden"
      />
    </div>
  );
}
