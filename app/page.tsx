import { getDisplayCurrency } from "@/lib/currency/server";
import { formatMoney } from "@/lib/format/currency";
import { directionGlyph, directionOf, formatPercent } from "@/lib/format/percent";

/**
 * The Board (§13). Phase 0 renders the structural shell: the lead cluster beside
 * the instrument it concerns, the accent-marked computed recap, and figures that
 * respect the currency toggle. Live data arrives in later phases.
 */

// Fixture lead story so the shell is useful with zero keys (§2).
const LEAD = {
  headline: "OPEC+ holds output targets as Brent extends weekly decline",
  sourceCount: 7,
  instrument: {
    symbol: "BRN",
    name: "Brent Crude",
    priceUsd: 71.4,
    change: -1.68,
    changePct: -2.3,
  },
};

export default async function BoardPage() {
  const currency = await getDisplayCurrency();
  const dir = directionOf(LEAD.instrument.change);
  const dirClass =
    dir === "gain" ? "dir-gain" : dir === "loss" ? "dir-loss" : "text-text-mid";

  return (
    <div className="py-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Lead cluster — news and price adjacent (§13). */}
        <article className="lg:col-span-8">
          <div className="text-text-mid flex items-center gap-3 text-[12px]">
            <span className="border-line rounded-[4px] border px-1.5 py-0.5">
              Session lead
            </span>
            {/* Source-count is the ranking, made visible (§1) — accent = ours. */}
            <span className="ours tnum">{LEAD.sourceCount} outlets covering</span>
          </div>
          <h1 className="font-editorial text-text-hi mt-3 max-w-[68ch] text-[34px] leading-tight">
            {LEAD.headline}
          </h1>

          <div className="border-line mt-5 flex items-center gap-4 border-t pt-4">
            <div>
              <div className="text-text-mid text-[12px]">
                {LEAD.instrument.name} · {LEAD.instrument.symbol}
              </div>
              <div className="tnum text-text-hi mt-0.5 text-[27px]">
                {formatMoney(LEAD.instrument.priceUsd, currency)}
              </div>
            </div>
            <div className={`tnum flex items-center gap-1.5 text-[15px] ${dirClass}`}>
              <span aria-hidden>{directionGlyph(LEAD.instrument.change)}</span>
              {formatMoney(Math.abs(LEAD.instrument.change), currency)}
              <span className="text-text-mid">·</span>
              {formatPercent(LEAD.instrument.changePct)}
            </div>
          </div>

          {/* Computed recap — accent marks it as OURS, not the wire's (§11). */}
          <div className="border-iris mt-6 border-l-2 pl-4">
            <div className="ours flex items-center gap-2 text-[12px]">
              <span aria-hidden>◆</span>
              <span>Computed from market data</span>
            </div>
            <p className="font-editorial text-text-hi mt-2 max-w-[68ch] text-[17px] leading-[1.6]">
              Brent settled 2.3% lower at $71.40, a third consecutive decline and the
              lowest close in over a month. Energy was the weakest of the sectors
              tracked. Seven outlets are covering the OPEC+ meeting.
            </p>
            <p className="text-text-low mt-2 text-[12px]">
              Illustrative fixture · live recaps generated deterministically in Phase 5
            </p>
          </div>
        </article>

        {/* Rail placeholder — movers/wire land in later phases. */}
        <aside className="lg:col-span-4">
          <div className="border-line bg-surface rounded-none border p-4">
            <h2 className="text-text-mid text-[13px] font-medium">
              Phase 0 · Foundation
            </h2>
            <p className="text-text-low mt-2 text-[13px] leading-relaxed">
              This is the layout shell: monochrome chrome, the reserved
              <span className="ours"> iris</span> accent for our own computed content,
              dual currency, and dark / light themes. Data surfaces arrive phase by
              phase.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
