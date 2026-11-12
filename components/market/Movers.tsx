import Link from "next/link";
import { ChangePill } from "@/components/market/ChangePill";
import { NoData, PriceStamp } from "@/components/market/Provenance";
import { readMovers } from "@/lib/market/read";
import { formatMoney } from "@/lib/format/currency";
import type { DisplayCurrency } from "@/lib/currency/peg";

/**
 * Largest moves among instruments with a real stored price, sorted by absolute
 * change. Every row prints its own source and time. With nothing stored the
 * block shows an empty state — never a placeholder price.
 */
export async function Movers({ currency }: { currency: DisplayCurrency }) {
  const rows = await readMovers(6);
  if (rows.length === 0) {
    return (
      <NoData>
        No price data is available right now. Movers appear here as soon as the market
        feed delivers prices.
      </NoData>
    );
  }
  return (
    <div className="list-card">
      <ul>
        {rows.map((row) => (
          <li key={row.symbol} className="border-line border-b last:border-b-0">
            <Link
              href={`/quote/${row.symbol}`}
              className="row-spine hover:bg-surface flex items-center justify-between gap-3 px-4 py-2.5 pl-5"
            >
              <span className="min-w-0">
                <span className="flex items-baseline gap-2">
                  <span className="tnum text-text-hi text-[13px]">{row.symbol}</span>
                  <span className="text-text-low truncate text-[12px]">{row.name}</span>
                </span>
                <PriceStamp stamp={row.priced} className="mt-0.5 block" />
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <span className="tnum text-text-hi text-[13px]">
                  {formatMoney(row.priceUsd, currency)}
                </span>
                <ChangePill
                  pct={row.changePct}
                  className="w-[72px] justify-end text-[12px]"
                />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="border-line text-text-low border-t px-4 py-2 text-[11px]">
        Ranked by absolute move among the instruments Mizaan has a current price for.
        Change is versus the prior close (24 hours for crypto).
      </p>
    </div>
  );
}
