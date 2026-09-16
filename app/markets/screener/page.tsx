import { ScreenerTable } from "@/components/market/ScreenerTable";
import { PageHeader } from "@/components/layout/PageHeader";
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
    "border-line bg-surface text-text-hi focus:border-iris/60 rounded-[8px] border px-2 py-1.5 text-[13px] transition-colors";

  return (
    <div className="pb-4">
      <div className="header-band bleed">
        <div className="mx-auto max-w-[1280px] px-4 py-8">
          <PageHeader
            kicker="server-side · global + GCC"
            title="Screener"
            subtitle="Filtered server-side across both the global and GCC rails, with a Shariah-compliance filter — no vendor call fires on render."
          />
        </div>
      </div>

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
          <span className="text-text-low text-[12px]">Shariah</span>
          <select name="shariah" defaultValue={shariah} className={field}>
            <option value="">Any</option>
            <option value="yes">Compliant</option>
            <option value="no">Non-compliant</option>
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
        <button type="submit" className="btn btn-primary relative text-[13px]">
          Apply
        </button>
      </form>

      <p className="text-text-low mt-5 mb-2 text-[12px]">
        <span className="tnum text-text-mid">{rows.length}</span> instruments
      </p>
      <div className="fade-up" style={{ "--d": "140ms" } as React.CSSProperties}>
        <ScreenerTable rows={rows} currency={currency} />
      </div>
    </div>
  );
}
