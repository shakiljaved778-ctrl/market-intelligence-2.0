import Link from "next/link";
import { readMovers } from "@/lib/market/read";
import { formatMoney } from "@/lib/format/currency";
import { directionGlyph, directionOf, formatPercent } from "@/lib/format/percent";
import type { DisplayCurrency } from "@/lib/currency/peg";

/** Session movers (§13), sorted by absolute move. Cache/fixture-backed. */
export async function Movers({ currency }: { currency: DisplayCurrency }) {
  const rows = await readMovers(6);
  return (
    <div className="list-card">
      <div className="border-line flex items-center justify-between border-b px-4 py-2.5">
        <h2 className="text-text-mid text-[13px] font-medium">Movers</h2>
        <span className="eyebrow">by absolute move</span>
      </div>
      <ul>
        {rows.map((row) => {
          const dir = directionOf(row.change);
          const dirClass =
            dir === "gain" ? "dir-gain" : dir === "loss" ? "dir-loss" : "text-text-mid";
          return (
            <li key={row.symbol} className="border-line border-b last:border-b-0">
              <Link
                href={`/quote/${row.symbol}`}
                className="row-spine hover:bg-surface flex items-center justify-between px-4 py-2.5 pl-5"
              >
                <span className="min-w-0">
                  <span className="tnum text-text-hi text-[13px]">{row.symbol}</span>
                  <span className="text-text-low ml-2 truncate text-[12px]">
                    {row.name}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="tnum text-text-hi text-[13px]">
                    {formatMoney(row.priceUsd, currency)}
                  </span>
                  <span
                    className={`tnum flex w-16 items-center justify-end gap-1 text-[12px] ${dirClass}`}
                  >
                    <span aria-hidden>{directionGlyph(row.change)}</span>
                    {formatPercent(row.changePct)}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
