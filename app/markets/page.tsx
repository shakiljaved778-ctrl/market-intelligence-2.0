import Link from "next/link";
import { GCC_EXCHANGES } from "@/content/gcc-companies";
import { pageMeta } from "@/lib/seo";
import { Movers } from "@/components/market/Movers";
import {
  SectorHeatmap,
  type HeatGroup,
  type HeatTile,
} from "@/components/market/SectorHeatmap";
import { AssetTabs } from "@/components/market/AssetTabs";
import { PageHeader } from "@/components/layout/PageHeader";
import { getDisplayCurrency } from "@/lib/currency/server";
import { sessionFor } from "@/lib/format/session";
import { UNIVERSE } from "@/fixtures/universe";
import { COMMODITY_ROWS, FX_ROWS, type MarketQuoteRow } from "@/fixtures/markets-extra";

function cryptoRows(): MarketQuoteRow[] {
  return UNIVERSE.filter((u) => u.assetClass === "crypto")
    .sort((a, b) => (b.marketCapUsd ?? 0) - (a.marketCapUsd ?? 0))
    .slice(0, 6)
    .map((u) => ({
      symbol: u.symbol,
      name: u.name,
      price: u.priceUsd,
      changePct: u.changePct,
    }));
}

export const metadata = pageMeta(
  "/markets",
  "Markets — global & GCC",
  "Global and GCC markets: session clocks, movers, a sector heatmap and a server-side screener. Index levels are currency-neutral and never converted.",
);

/** Heatmap data: equities grouped by sector, sized by market cap. */
function heatmapData(): HeatGroup[] {
  const bySector = new Map<string, HeatTile[]>();
  for (const u of UNIVERSE) {
    if (u.assetClass !== "equity" || !u.marketCapUsd) continue;
    const sec = u.sector ?? "Other";
    const arr = bySector.get(sec) ?? [];
    arr.push({ name: u.symbol, size: u.marketCapUsd, changePct: u.changePct });
    bySector.set(sec, arr);
  }
  return [...bySector.entries()]
    .map(([name, children]) => ({
      name,
      children: children.sort((a, b) => b.size - a.size).slice(0, 5),
    }))
    .sort(
      (a, b) =>
        b.children.reduce((n, c) => n + c.size, 0) -
        a.children.reduce((n, c) => n + c.size, 0),
    )
    .slice(0, 6);
}

const EXCHANGES: { code: string; label: string }[] = [
  { code: "NASDAQ", label: "NASDAQ" },
  { code: "NYSE", label: "NYSE" },
  { code: "LSE", label: "London" },
  { code: "TSE", label: "Tokyo" },
  { code: "QSE", label: "Qatar (EOD)" },
  { code: "CRYPTO", label: "Crypto" },
];

export default async function MarketsPage() {
  const currency = await getDisplayCurrency();
  return (
    <div className="pb-4">
      <div className="header-band bleed">
        <div className="mx-auto max-w-[1280px] px-4 py-8">
          <PageHeader
            live
            kicker="global markets + GCC rail"
            title="Markets"
            subtitle="Session clocks, movers and a server-side screener across the global and GCC rails. Index levels are currency-neutral and never converted."
            action={
              <Link href="/markets/screener" className="btn btn-ghost text-[13px]">
                Open screener <span aria-hidden>→</span>
              </Link>
            }
          />
        </div>
      </div>

      {/* Per-exchange session clocks (§13). Global live; GCC labelled EOD. */}
      <section
        className="fade-up mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
        style={{ "--d": "80ms" } as React.CSSProperties}
      >
        {EXCHANGES.map((ex) => {
          const s = sessionFor(ex.code);
          const open = s.state === "open";
          return (
            <div key={ex.code} className="card card-hover p-3.5">
              <div className="flex items-center justify-between">
                <div className="text-text-mid text-[12px]">{ex.label}</div>
                {open ? <span className="live-dot" aria-hidden /> : null}
              </div>
              <div
                className={`mt-2 text-[13px] ${open ? "dir-gain" : "text-text-low"}`}
              >
                {s.label}
              </div>
            </div>
          );
        })}
      </section>

      {/* GCC exchange hubs (§5) — plain links to the per-exchange company lists. */}
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

      {/* Sector heatmap — treemap sized by market cap, coloured by change. */}
      <section
        className="fade-up mt-10"
        style={{ "--d": "160ms" } as React.CSSProperties}
      >
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="t-h3 font-editorial text-ink">Sector heatmap</h2>
          <span className="t-micro text-ink-3">equities · illustrative</span>
        </div>
        <SectorHeatmap data={heatmapData()} />
      </section>

      <section
        className="fade-up mt-10 grid grid-cols-1 gap-8 lg:grid-cols-12"
        style={{ "--d": "220ms" } as React.CSSProperties}
      >
        <div className="lg:col-span-7">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="t-h3 font-editorial text-ink">Movers</h2>
            <Link href="/markets/screener" className="text-brand text-[12px]">
              Screener <span aria-hidden>→</span>
            </Link>
          </div>
          <Movers currency={currency} />
        </div>
        <div className="lg:col-span-5">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="t-h3 font-editorial text-ink">FX · Commodities · Crypto</h2>
          </div>
          <AssetTabs fx={FX_ROWS} commodities={COMMODITY_ROWS} crypto={cryptoRows()} />
        </div>
      </section>
    </div>
  );
}
