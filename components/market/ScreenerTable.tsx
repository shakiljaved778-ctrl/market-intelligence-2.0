import Link from "next/link";
import { formatMoney } from "@/lib/format/currency";
import { directionGlyph, directionOf, formatPercent } from "@/lib/format/percent";
import type { DisplayCurrency } from "@/lib/currency/peg";
import type { MarketRow } from "@/lib/market/read";

function compactUsd(n: number | null, currency: DisplayCurrency): string {
  if (n === null) return "—";
  const v = currency === "USD" ? n : n * 3.64;
  const unit = currency === "USD" ? "$" : "QR ";
  if (v >= 1e12) return `${unit}${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `${unit}${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${unit}${(v / 1e6).toFixed(0)}M`;
  return `${unit}${v.toFixed(0)}`;
}

/** Server-rendered screener results (§13). Filtering happens on the server. */
export function ScreenerTable({
  rows,
  currency,
}: {
  rows: MarketRow[];
  currency: DisplayCurrency;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-text-mid border-line border px-4 py-8 text-center text-[13px]">
        No instruments match these filters.
      </p>
    );
  }
  return (
    <div className="border-line overflow-x-auto border">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-line text-text-mid border-b text-left">
            <th className="px-3 py-2 font-medium">Symbol</th>
            <th className="px-3 py-2 font-medium">Sector</th>
            <th className="px-3 py-2 font-medium">Exchange</th>
            <th className="px-3 py-2 text-right font-medium">Price</th>
            <th className="px-3 py-2 text-right font-medium">Change</th>
            <th className="px-3 py-2 text-right font-medium">Mkt cap</th>
            <th className="px-3 py-2 text-center font-medium">Shariah</th>
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
                className="border-line hover:bg-surface border-b last:border-b-0"
              >
                <td className="px-3 py-2">
                  <Link href={`/quote/${row.symbol}`} className="hover:text-iris">
                    <span className="tnum text-text-hi">{row.symbol}</span>
                    <span className="text-text-low ml-2 text-[12px]">{row.name}</span>
                  </Link>
                </td>
                <td className="text-text-mid px-3 py-2">{row.sector ?? "—"}</td>
                <td className="text-text-mid px-3 py-2">{row.exchange}</td>
                <td className="tnum text-text-hi px-3 py-2 text-right">
                  {formatMoney(row.priceUsd, currency)}
                </td>
                <td className={`tnum px-3 py-2 text-right ${dirClass}`}>
                  <span aria-hidden>{directionGlyph(row.change)}</span>{" "}
                  {formatPercent(row.changePct)}
                </td>
                <td className="tnum text-text-mid px-3 py-2 text-right">
                  {compactUsd(row.marketCapUsd, currency)}
                </td>
                <td className="px-3 py-2 text-center">
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
