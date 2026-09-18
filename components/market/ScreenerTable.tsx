import Link from "next/link";
import { Sparkline } from "@/components/market/Sparkline";
import { SampleTag } from "@/components/market/Provenance";
import { formatCompactMoney, formatMoney } from "@/lib/format/currency";
import { directionGlyph, directionOf, formatPercent } from "@/lib/format/percent";
import { provenanceTitle } from "@/lib/market/provenance";
import type { DisplayCurrency } from "@/lib/currency/peg";
import type { MarketRow } from "@/lib/market/read";

/** Server-rendered screener results (§13). Filtering happens on the server. */
export function ScreenerTable({
  rows,
  currency,
  sparks = {},
}: {
  rows: MarketRow[];
  currency: DisplayCurrency;
  /** symbol -> recent close series for the trend sparkline. */
  sparks?: Record<string, number[]>;
}) {
  if (rows.length === 0) {
    return (
      <div className="card text-text-mid px-4 py-10 text-center text-[13px]">
        No instruments match these filters.
      </div>
    );
  }
  return (
    <div className="list-card overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-line bg-surface text-text-mid border-b text-left">
            <th className="px-3 py-2.5 font-medium">Symbol</th>
            <th className="px-3 py-2.5 font-medium">Sector</th>
            <th className="px-3 py-2.5 font-medium">Exchange</th>
            <th className="px-3 py-2.5 text-right font-medium">Price</th>
            <th className="px-3 py-2.5 text-right font-medium">Change</th>
            <th className="px-3 py-2.5 text-center font-medium">Trend · 30d</th>
            <th className="px-3 py-2.5 text-right font-medium">Mkt cap</th>
            <th className="px-3 py-2.5 text-center font-medium">Shariah</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const dir = directionOf(row.change);
            const dirClass =
              dir === "gain"
                ? "dir-gain"
                : dir === "loss"
                  ? "dir-loss"
                  : "text-text-mid";
            return (
              <tr
                key={row.symbol}
                className="border-line hover:bg-surface border-b transition-colors last:border-b-0"
              >
                <td className="px-3 py-2.5">
                  <Link href={`/quote/${row.symbol}`} className="hover:text-iris">
                    <span className="tnum text-text-hi">{row.symbol}</span>
                    <span className="text-text-low ml-2 text-[12px]">{row.name}</span>
                  </Link>
                  <SampleTag quote={row.quote} />
                </td>
                <td className="text-text-mid px-3 py-2.5">{row.sector ?? "—"}</td>
                <td className="text-text-mid px-3 py-2.5">{row.exchange}</td>
                <td
                  className="tnum text-text-hi px-3 py-2.5 text-right"
                  title={provenanceTitle(row.quote)}
                >
                  {formatMoney(row.priceUsd, currency)}
                </td>
                <td className={`tnum px-3 py-2.5 text-right ${dirClass}`}>
                  <span aria-hidden>{directionGlyph(row.change)}</span>{" "}
                  {formatPercent(row.changePct)}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex justify-center">
                    <Sparkline values={sparks[row.symbol] ?? []} up={row.change >= 0} />
                  </div>
                </td>
                <td className="tnum text-text-mid px-3 py-2.5 text-right">
                  {formatCompactMoney(row.marketCapUsd, currency)}
                </td>
                <td className="px-3 py-2.5 text-center">
                  {row.isShariahCompliant === null ? (
                    <span className="text-text-low">—</span>
                  ) : row.isShariahCompliant ? (
                    <span
                      className="dir-gain"
                      title="Shariah-compliant"
                      aria-label="Shariah-compliant"
                    >
                      ✓
                    </span>
                  ) : (
                    <span
                      className="text-text-low"
                      title="Not Shariah-compliant"
                      aria-label="Not Shariah-compliant"
                    >
                      ✕
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
