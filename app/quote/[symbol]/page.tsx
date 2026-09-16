import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PriceChart } from "@/components/chart/PriceChart";
import { getDisplayCurrency } from "@/lib/currency/server";
import { readQuote } from "@/lib/market/read";
import { formatMoney } from "@/lib/format/currency";
import { directionGlyph, directionOf, formatPercent } from "@/lib/format/percent";
import { sessionFor } from "@/lib/format/session";
import { universeBySymbol } from "@/fixtures/universe";

interface Params {
  params: Promise<{ symbol: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { symbol } = await params;
  const sym = symbol.toUpperCase();
  return { title: `${sym} — quote` };
}

export default async function QuotePage({ params }: Params) {
  const { symbol } = await params;
  const sym = symbol.toUpperCase();
  const [quote, currency] = await Promise.all([readQuote(sym), getDisplayCurrency()]);
  if (!quote) notFound();

  const meta = universeBySymbol(sym);
  const session = sessionFor(meta?.exchange ?? null);
  const dir = directionOf(quote.change);
  const dirClass =
    dir === "gain" ? "dir-gain" : dir === "loss" ? "dir-loss" : "text-text-mid";

  const stats: { label: string; value: string }[] = [
    {
      label: "Open",
      value: quote.open != null ? formatMoney(quote.open, currency) : "—",
    },
    {
      label: "High",
      value: quote.high != null ? formatMoney(quote.high, currency) : "—",
    },
    { label: "Low", value: quote.low != null ? formatMoney(quote.low, currency) : "—" },
    {
      label: "Prev close",
      value: quote.prevClose != null ? formatMoney(quote.prevClose, currency) : "—",
    },
    {
      label: "Volume",
      value: quote.volume != null ? quote.volume.toLocaleString("en-US") : "—",
    },
    {
      label: "Mkt cap",
      value:
        quote.marketCapUsd != null ? formatMoney(quote.marketCapUsd, currency) : "—",
    },
  ];

  return (
    <div className="py-8">
      {/* Price header with session state and delay label (§13). */}
      <div className="border-line flex flex-wrap items-end justify-between gap-4 border-b pb-5">
        <div>
          <div className="text-text-mid flex items-center gap-2 text-[13px]">
            <span className="font-editorial text-text-hi text-[21px]">
              {meta?.name ?? sym}
            </span>
            <span className="tnum">{sym}</span>
            {meta ? <span className="text-text-low">· {meta.exchange}</span> : null}
          </div>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="tnum text-text-hi text-[34px]">
              {formatMoney(quote.priceUsd, currency)}
            </span>
            <span className={`tnum flex items-center gap-1.5 text-[15px] ${dirClass}`}>
              <span aria-hidden>{directionGlyph(quote.change)}</span>
              {formatMoney(Math.abs(quote.change), currency)}
              <span className="text-text-mid">·</span>
              {formatPercent(quote.changePct)}
            </span>
          </div>
        </div>
        <div className="text-right">
          <span
            className={`inline-block rounded-[6px] border px-2 py-1 text-[12px] ${
              session.state === "open"
                ? "border-gain/40 dir-gain"
                : "border-line text-text-mid"
            }`}
          >
            {session.label}
          </span>
          {quote.dataDelayMinutes > 0 || session.delayed ? (
            <p className="text-text-low mt-1 text-[11px]">
              Delayed data · source {quote.provider}
            </p>
          ) : (
            <p className="text-text-low mt-1 text-[11px]">Source {quote.provider}</p>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <PriceChart symbol={sym} />

          <h2 className="text-text-mid mt-8 mb-2 text-[13px] font-medium">
            Key statistics
          </h2>
          <dl className="border-line grid grid-cols-2 border sm:grid-cols-3">
            {stats.map((s) => (
              <div key={s.label} className="border-line border-r border-b px-3 py-2.5">
                <dt className="text-text-low text-[12px]">{s.label}</dt>
                <dd className="tnum text-text-hi mt-0.5 text-[15px]">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <aside className="lg:col-span-4">
          {/* Computed "how it moved" block — deterministic prose lands in Phase 5. */}
          <div className="border-iris border-l-2 pl-4">
            <div className="ours flex items-center gap-2 text-[12px]">
              <span aria-hidden>◆</span>
              <span>How it moved</span>
            </div>
            <p className="text-text-low mt-2 text-[13px] leading-relaxed">
              A computed, deterministic recap of this instrument&rsquo;s session is
              generated in Phase 5 from our own price data.
            </p>
          </div>

          <h2 className="text-text-mid mt-8 mb-2 text-[13px] font-medium">
            Related coverage
          </h2>
          <p className="text-text-low border-line border px-3 py-6 text-center text-[13px]">
            News clusters bound to {sym} appear here once the curation engine (Phase 4)
            is live.
          </p>
        </aside>
      </div>
    </div>
  );
}
