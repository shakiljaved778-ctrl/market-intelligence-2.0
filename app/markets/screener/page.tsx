import { ScreenerTable } from "@/components/market/ScreenerTable";
import { getDisplayCurrency } from "@/lib/currency/server";
import { readUniverse, type MarketRow } from "@/lib/market/read";

export const metadata = { title: "Screener" };

interface SearchParams {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/**
 * Screener (§13) — filtering runs on the SERVER over the instrument universe +
 * latest quotes. Includes a Shariah-compliance filter, a genuine differentiator.
 * Cache/fixture-backed; no vendor call fires on render.
 */
export default async function ScreenerPage({ searchParams }: SearchParams) {
  const sp = await searchParams;
  const currency = await getDisplayCurrency();

  const assetClass = one(sp.assetClass);
  const exchange = one(sp.exchange);
  const shariah = one(sp.shariah); // "yes" | "no" | ""
  const direction = one(sp.direction); // "gainers" | "losers" | ""

  const all = await readUniverse();
  const rows: MarketRow[] = all.filter((r) => {
    if (assetClass && r.assetClass !== assetClass) return false;
    if (exchange && r.exchange !== exchange) return false;
    if (shariah === "yes" && r.isShariahCompliant !== true) return false;
    if (shariah === "no" && r.isShariahCompliant !== false) return false;
    if (direction === "gainers" && r.changePct <= 0) return false;
    if (direction === "losers" && r.changePct >= 0) return false;
    return true;
  });
  rows.sort((a, b) => b.changePct - a.changePct);

  const exchanges = [...new Set(all.map((r) => r.exchange))].sort();
  const field =
    "border-line bg-surface text-text-hi rounded-[6px] border px-2 py-1.5 text-[13px]";

  return (
    <div className="py-8">
      <h1 className="font-editorial text-text-hi text-[27px]">Screener</h1>
      <p className="text-text-mid mt-1 text-[13px]">
        Filtered server-side across both the global and GCC rails.
      </p>

      {/* GET form → server-side filtering via searchParams. */}
      <form method="get" className="mt-5 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-text-low text-[12px]">Asset class</span>
          <select name="assetClass" defaultValue={assetClass} className={field}>
            <option value="">All</option>
            <option value="equity">Equity</option>
            <option value="crypto">Crypto</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
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
        <label className="flex flex-col gap-1">
          <span className="text-text-low text-[12px]">Shariah</span>
          <select name="shariah" defaultValue={shariah} className={field}>
            <option value="">Any</option>
            <option value="yes">Compliant</option>
            <option value="no">Non-compliant</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-text-low text-[12px]">Direction</span>
          <select name="direction" defaultValue={direction} className={field}>
            <option value="">Any</option>
            <option value="gainers">Gainers</option>
            <option value="losers">Losers</option>
          </select>
        </label>
        <button
          type="submit"
          className="border-line bg-raised text-text-hi rounded-[6px] border px-3 py-1.5 text-[13px]"
        >
          Apply
        </button>
      </form>

      <p className="text-text-low mt-4 mb-2 text-[12px]">{rows.length} instruments</p>
      <ScreenerTable rows={rows} currency={currency} />
    </div>
  );
}
