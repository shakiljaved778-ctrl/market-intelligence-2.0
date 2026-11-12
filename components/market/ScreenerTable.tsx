import Link from "next/link";
import { ChangePill, changeDir } from "@/components/market/ChangePill";
import { PriceStamp } from "@/components/market/Provenance";
import { Sparkline } from "@/components/market/Sparkline";
import { formatCompactMoney, formatMoney } from "@/lib/format/currency";
import type { DisplayCurrency } from "@/lib/currency/peg";
import type { MarketRow } from "@/lib/market/read";

export type SortKey = "symbol" | "sector" | "exchange" | "price" | "change" | "mcap";

/**
 * Server-rendered screener results. Sorting is a link per column header (the
 * page re-renders server-side), so it works without JavaScript and every view
 * has a URL. Each row prints the source and time of its price.
 */
export function ScreenerTable({
  rows,
  currency,
  sparks = {},
  sort,
  asc,
  sortHref,
}: {
  rows: MarketRow[];
  currency: DisplayCurrency;
  /** symbol -> recent daily closes for the trend sparkline (absent = no data). */
  sparks?: Record<string, number[]>;
  sort: SortKey;
  asc: boolean;
  sortHref: (key: SortKey) => string;
}) {
  if (rows.length === 0) {
    return (
      <div className="card text-text-mid px-4 py-10 text-center text-[13px]">
        No instruments match these filters.
      </div>
    );
  }

  const Th = ({
    k,
    label,
    align = "left",
  }: {
    k: SortKey;
    label: string;
    align?: "left" | "right";
  }) => {
    const active = sort === k;
    return (
      <th
        scope="col"
        aria-sort={active ? (asc ? "ascending" : "descending") : "none"}
        className={`px-3 py-2.5 font-medium ${align === "right" ? "text-right" : ""}`}
      >
        <Link
          href={sortHref(k)}
          className={`hover:text-iris inline-flex items-center gap-1 ${active ? "text-text-hi" : ""}`}
          title={`Sort by ${label.toLowerCase()}`}
        >
          {label}
          <span aria-hidden className="text-[10px]">
            {active ? (asc ? "▲" : "▼") : "↕"}
          </span>
        </Link>
      </th>
    );
  };

  return (
    <>
      {/* Mobile (<md): a stacked card per instrument so every field is visible
          without a horizontal scroll off the edge of the screen. */}
      <div className="list-card divide-line divide-y md:hidden">
        {rows.map((row) => (
          <div key={row.symbol} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <Link
                href={`/quote/${row.symbol}`}
                className="hover:text-iris min-w-0 flex-1"
              >
                <span className="tnum text-text-hi text-[15px]">{row.symbol}</span>
                <span className="text-text-mid mt-0.5 block truncate text-[12px]">
                  {row.name}
                </span>
              </Link>
              <div className="shrink-0 text-right">
                <div className="tnum text-text-hi text-[15px]">
                  {formatMoney(row.priceUsd, currency)}
                </div>
                <ChangePill pct={row.changePct} className="mt-0.5 text-[12px]" />
              </div>
            </div>

            <div className="text-text-low mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
              <div className="flex items-center justify-between gap-2">
                <span>Sector</span>
                <span className="text-text-mid truncate text-right">
                  {row.sector ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>Exchange</span>
                <span className="text-text-mid text-right">{row.exchange}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>Mkt cap</span>
                <span className="tnum text-text-mid text-right">
                  {formatCompactMoney(row.marketCapUsd, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>Trend · 30d</span>
                <Sparkline
                  values={sparks[row.symbol] ?? []}
                  up={changeDir(row.changePct) !== "down"}
                />
              </div>
            </div>
            <PriceStamp stamp={row.priced} className="mt-3 block" />
          </div>
        ))}
      </div>

      {/* Desktop (md+): the full screener table, scrollable on narrower widths. */}
      <div className="list-card hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-line bg-surface text-text-mid border-b text-left">
              <Th k="symbol" label="Symbol" />
              <Th k="sector" label="Sector" />
              <Th k="exchange" label="Exchange" />
              <Th k="price" label="Price" align="right" />
              <Th k="change" label="Change" align="right" />
              <th scope="col" className="px-3 py-2.5 text-center font-medium">
                Trend · 30d
              </th>
              <Th k="mcap" label="Mkt cap" align="right" />
              <th scope="col" className="px-3 py-2.5 font-medium">
                Source · as of
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.symbol}
                className="border-line hover:bg-surface border-b transition-colors last:border-b-0"
              >
                <td className="px-3 py-2.5">
                  <Link href={`/quote/${row.symbol}`} className="hover:text-iris">
                    <span className="tnum text-text-hi">{row.symbol}</span>
                    <span className="text-text-low ml-2 text-[12px]">{row.name}</span>
                  </Link>
                </td>
                <td className="text-text-mid px-3 py-2.5">{row.sector ?? "—"}</td>
                <td className="text-text-mid px-3 py-2.5">{row.exchange}</td>
                <td className="tnum text-text-hi px-3 py-2.5 text-right">
                  {formatMoney(row.priceUsd, currency)}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <ChangePill pct={row.changePct} className="justify-end" />
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex justify-center">
                    <Sparkline
                      values={sparks[row.symbol] ?? []}
                      up={changeDir(row.changePct) !== "down"}
                    />
                  </div>
                </td>
                <td className="tnum text-text-mid px-3 py-2.5 text-right">
                  {formatCompactMoney(row.marketCapUsd, currency)}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <PriceStamp stamp={row.priced} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
