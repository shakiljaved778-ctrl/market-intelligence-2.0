import Link from "next/link";
import { ScreenerTable, type SortKey } from "@/components/market/ScreenerTable";
import { NoData } from "@/components/market/Provenance";
import { pageMeta } from "@/lib/seo";
import { PageHeader } from "@/components/layout/PageHeader";
import { getDisplayCurrency } from "@/lib/currency/server";
import { summaryStamp } from "@/lib/market/provenance";
import {
  coverageOf,
  readTrends,
  readUniverse,
  type MarketRow,
} from "@/lib/market/read";

export const metadata = pageMeta(
  "/markets/screener",
  "Stock screener",
  "Screen the instruments Mizaan holds a current price for — filter by asset class, exchange and direction, sort any column. Every price states its source and time.",
);

interface SearchParams {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

const PAGE_SIZE = 25;
const SORT_KEYS: SortKey[] = [
  "symbol",
  "sector",
  "exchange",
  "price",
  "change",
  "mcap",
];

function compare(key: SortKey, a: MarketRow, b: MarketRow): number {
  switch (key) {
    case "symbol":
      return a.symbol.localeCompare(b.symbol);
    case "sector":
      return (a.sector ?? "").localeCompare(b.sector ?? "");
    case "exchange":
      return a.exchange.localeCompare(b.exchange);
    case "price":
      return a.priceUsd - b.priceUsd;
    case "mcap":
      return (a.marketCapUsd ?? -1) - (b.marketCapUsd ?? -1);
    case "change":
      return a.changePct - b.changePct;
  }
}

/**
 * Screener — filtering, sorting and pagination all run on the SERVER through
 * URL parameters, so every view is linkable and works without JavaScript. Only
 * instruments with a real stored price are listed. (A Shariah-compliance filter
 * returns once a documented, rule-based screen is in place — see /methodology.)
 */
export default async function ScreenerPage({ searchParams }: SearchParams) {
  const sp = await searchParams;
  const currency = await getDisplayCurrency();

  const assetClass = one(sp.assetClass);
  const exchange = one(sp.exchange);
  const direction = one(sp.direction); // "gainers" | "losers" | ""
  const sortRaw = one(sp.sort) as SortKey;
  const sort: SortKey = SORT_KEYS.includes(sortRaw) ? sortRaw : "change";
  // Text columns default to A→Z; numeric columns to largest first.
  const defaultDir = sort === "symbol" || sort === "sector" || sort === "exchange";
  const dirRaw = one(sp.dir);
  const asc = dirRaw === "asc" ? true : dirRaw === "desc" ? false : defaultDir;

  const all = await readUniverse();
  const coverage = coverageOf(all);
  const filtered: MarketRow[] = all.filter((r) => {
    if (assetClass && r.assetClass !== assetClass) return false;
    if (exchange && r.exchange !== exchange) return false;
    if (direction === "gainers" && r.changePct <= 0) return false;
    if (direction === "losers" && r.changePct >= 0) return false;
    return true;
  });
  filtered.sort((a, b) => {
    const c = compare(sort, a, b);
    return (asc ? c : -c) || a.symbol.localeCompare(b.symbol);
  });

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number.parseInt(one(sp.page), 10) || 1));
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const sparks = await readTrends(rows.map((r) => r.symbol));

  // Build a link that keeps the current filters and overrides some parameters.
  const href = (over: Record<string, string>) => {
    const q = new URLSearchParams();
    const base: Record<string, string> = {
      assetClass,
      exchange,
      direction,
      sort,
      dir: asc ? "asc" : "desc",
      page: String(page),
      ...over,
    };
    for (const [k, v] of Object.entries(base)) {
      if (!v) continue;
      if (k === "page" && v === "1") continue;
      q.set(k, v);
    }
    const s = q.toString();
    return s ? `/markets/screener?${s}` : "/markets/screener";
  };

  const exchanges = [...new Set(all.map((r) => r.exchange))].sort();
  const stamp = summaryStamp(filtered.map((r) => r.priced));
  const field =
    "border-line bg-surface text-text-hi focus:border-iris/60 min-h-[44px] rounded-[8px] border px-2 py-1.5 text-[13px] transition-colors";

  return (
    <div className="pb-4">
      <div className="header-band bleed">
        <div className="mx-auto max-w-[1280px] px-4 py-8">
          <PageHeader
            kicker="global + GCC"
            title="Screener"
            subtitle="Filter and sort the instruments Mizaan holds a current price for. Every price states its source and time."
          />
        </div>
      </div>

      {all.length === 0 ? (
        <div className="mt-6">
          <NoData>
            No price data is available right now, so there is nothing to screen. Rows
            appear here as soon as the market feed delivers prices.
          </NoData>
        </div>
      ) : (
        <>
          {/* GET form → server-side filtering via searchParams. */}
          <form
            method="get"
            className="card fade-up mt-6 flex flex-wrap items-end gap-3 p-4"
            style={{ "--d": "80ms" } as React.CSSProperties}
          >
            <label className="relative flex flex-col gap-1">
              <span className="text-text-low text-[12px]">Asset class</span>
              <select name="assetClass" defaultValue={assetClass} className={field}>
                <option value="">All</option>
                <option value="equity">Equity</option>
                <option value="crypto">Crypto</option>
              </select>
            </label>
            <label className="relative flex flex-col gap-1">
              <span className="text-text-low text-[12px]">Exchange</span>
              <select name="exchange" defaultValue={exchange} className={field}>
                <option value="">All</option>
                {exchanges.map((ex) => (
                  <option key={ex} value={ex}>
                    {ex}
                  </option>
                ))}
              </select>
            </label>
            <label className="relative flex flex-col gap-1">
              <span className="text-text-low text-[12px]">Direction</span>
              <select name="direction" defaultValue={direction} className={field}>
                <option value="">Any</option>
                <option value="gainers">Gainers</option>
                <option value="losers">Losers</option>
              </select>
            </label>
            <label className="relative flex flex-col gap-1">
              <span className="text-text-low text-[12px]">Sort by</span>
              <select name="sort" defaultValue={sort} className={field}>
                <option value="change">Change</option>
                <option value="price">Price</option>
                <option value="mcap">Market cap</option>
                <option value="symbol">Symbol</option>
                <option value="sector">Sector</option>
                <option value="exchange">Exchange</option>
              </select>
            </label>
            <label className="relative flex flex-col gap-1">
              <span className="text-text-low text-[12px]">Order</span>
              <select name="dir" defaultValue={asc ? "asc" : "desc"} className={field}>
                <option value="desc">High to low</option>
                <option value="asc">Low to high</option>
              </select>
            </label>
            <button
              type="submit"
              className="btn btn-primary relative min-h-[44px] text-[13px]"
            >
              Apply
            </button>
          </form>

          <div className="mt-5 mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-text-low text-[12px]">
              <span className="tnum text-text-mid">{filtered.length}</span>{" "}
              {filtered.length === 1 ? "instrument" : "instruments"}
              {pages > 1 ? (
                <>
                  {" "}
                  · page <span className="tnum text-text-mid">{page}</span> of{" "}
                  <span className="tnum text-text-mid">{pages}</span>
                </>
              ) : null}
            </p>
            <p className="text-text-low text-[12px]">
              <span className="tnum text-text-mid">{coverage.priced}</span> of{" "}
              <span className="tnum text-text-mid">{coverage.total}</span> tracked
              instruments have a current price; the rest are not listed.
            </p>
          </div>

          <div className="fade-up" style={{ "--d": "140ms" } as React.CSSProperties}>
            <ScreenerTable
              rows={rows}
              currency={currency}
              sparks={sparks}
              sort={sort}
              asc={asc}
              sortHref={(key) =>
                href({
                  sort: key,
                  // Clicking the active column flips it; a new column starts at
                  // its natural order.
                  dir:
                    key === sort
                      ? asc
                        ? "desc"
                        : "asc"
                      : key === "symbol" || key === "sector" || key === "exchange"
                        ? "asc"
                        : "desc",
                  page: "1",
                })
              }
            />
          </div>

          {pages > 1 ? (
            <nav
              aria-label="Screener pages"
              className="mt-4 flex items-center justify-between gap-3 text-[13px]"
            >
              {page > 1 ? (
                <Link
                  href={href({ page: String(page - 1) })}
                  rel="prev"
                  className="btn btn-ghost min-h-[44px]"
                >
                  <span aria-hidden>←</span> Previous
                </Link>
              ) : (
                <span />
              )}
              <span className="text-text-low tnum">
                {page} / {pages}
              </span>
              {page < pages ? (
                <Link
                  href={href({ page: String(page + 1) })}
                  rel="next"
                  className="btn btn-ghost min-h-[44px]"
                >
                  Next <span aria-hidden>→</span>
                </Link>
              ) : (
                <span />
              )}
            </nav>
          ) : null}

          {stamp ? <p className="text-text-low mt-3 text-[11px]">{stamp}.</p> : null}
          <p className="text-text-low mt-1 text-[11px]">
            Change is versus the prior close (24 hours for crypto). The 30-day trend is
            drawn only where daily closes are stored. A Shariah-compliance screen will
            be added once its method is published on the{" "}
            <Link href="/methodology" className="hover:text-iris underline">
              methodology
            </Link>{" "}
            page.
          </p>
        </>
      )}
    </div>
  );
}
