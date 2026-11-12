import Link from "next/link";
import { GCC_EXCHANGES } from "@/content/gcc-companies";
import { pageMeta } from "@/lib/seo";
import { AssetTabs } from "@/components/market/AssetTabs";
import { Movers } from "@/components/market/Movers";
import { SectorHeatmap } from "@/components/market/SectorHeatmap";
import { SessionClocks } from "@/components/market/SessionClocks";
import { PageHeader } from "@/components/layout/PageHeader";
import { getDisplayCurrency } from "@/lib/currency/server";
import { readCommodityRows, readCryptoRows, readFxRows } from "@/lib/market/levels";
import { readUniverse } from "@/lib/market/read";

export const metadata = pageMeta(
  "/markets",
  "Markets — global and GCC",
  "Session hours for Gulf and global exchanges, the day's largest moves, a sector heatmap, FX reference rates, energy benchmarks and crypto — every figure with its source and time.",
);

export default async function MarketsPage() {
  const [currency, universe, fx, commodities, crypto] = await Promise.all([
    getDisplayCurrency(),
    readUniverse(),
    readFxRows(),
    readCommodityRows(),
    readCryptoRows(6),
  ]);
  return (
    <div className="pb-4">
      <div className="header-band bleed">
        <div className="mx-auto max-w-[1280px] px-4 py-8">
          <PageHeader
            kicker="global markets + GCC"
            title="Markets"
            subtitle="Session hours, the largest moves, sectors, FX, energy and crypto. Every figure states its source and time; index levels and percentages are never currency-converted."
            action={
              <Link href="/markets/screener" className="btn btn-ghost text-[13px]">
                Open screener <span aria-hidden>→</span>
              </Link>
            }
          />
        </div>
      </div>

      {/* Per-exchange session clocks — Gulf venues first. */}
      <section
        className="fade-up mt-6"
        style={{ "--d": "80ms" } as React.CSSProperties}
        aria-label="Exchange trading hours"
      >
        <SessionClocks nowIso={new Date().toISOString()} />
      </section>

      {/* GCC exchange hubs — links to the per-exchange company lists. */}
      <section
        className="fade-up mt-5 flex flex-wrap items-center gap-2"
        style={{ "--d": "120ms" } as React.CSSProperties}
      >
        <span className="t-micro text-ink-3">GCC exchanges:</span>
        {GCC_EXCHANGES.map((e) => (
          <Link
            key={e.id}
            href={`/markets/${e.id}`}
            className="border-hairline text-ink-2 hover:text-brand rounded-full border px-3 py-1 text-[12px]"
          >
            {e.shortName}
          </Link>
        ))}
      </section>

      <section
        className="fade-up mt-10"
        style={{ "--d": "160ms" } as React.CSSProperties}
      >
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="t-h3 font-editorial text-ink">Sector heatmap</h2>
          <span className="t-micro text-ink-3">US equities</span>
        </div>
        <SectorHeatmap rows={universe} />
      </section>

      <section
        className="fade-up mt-10 grid grid-cols-1 gap-8 lg:grid-cols-12"
        style={{ "--d": "220ms" } as React.CSSProperties}
      >
        <div className="min-w-0 lg:col-span-7">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="t-h3 font-editorial text-ink">Movers</h2>
            <Link href="/markets/screener" className="text-brand text-[12px]">
              Screener <span aria-hidden>→</span>
            </Link>
          </div>
          <Movers currency={currency} />
        </div>
        <div className="min-w-0 lg:col-span-5">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="t-h3 font-editorial text-ink">FX · Commodities · Crypto</h2>
          </div>
          <AssetTabs fx={fx} commodities={commodities} crypto={crypto} />
        </div>
      </section>
    </div>
  );
}
