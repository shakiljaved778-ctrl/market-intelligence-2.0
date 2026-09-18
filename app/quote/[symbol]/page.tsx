import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PriceChart } from "@/components/chart/PriceChart";
import { QuoteProvenance } from "@/components/market/Provenance";
import { getDisplayCurrency } from "@/lib/currency/server";
import { readCandles, readQuote } from "@/lib/market/read";
import { readWire } from "@/lib/news/read";
import { sectionMeta } from "@/lib/curation/section";
import { deriveInstrumentRecap } from "@/lib/narrative/derive";
import { instrumentRecap } from "@/lib/narrative/recap";
import { formatCompactMoney, formatMoney } from "@/lib/format/currency";
import { directionGlyph, directionOf, formatPercent } from "@/lib/format/percent";
import { relativeTime } from "@/lib/format/relative-time";
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

  // News clusters bound to this instrument, newest-ranked first.
  const coverage = (await readWire({ ticker: sym })).slice(0, 6);

  // Computed "how it moved" recap — deterministic, from our own candles (§9).
  const candles = await readCandles(sym, "6M");
  const recap = instrumentRecap(
    deriveInstrumentRecap(meta?.name ?? sym, currency, quote, candles),
  );
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
      value: formatCompactMoney(quote.marketCapUsd ?? null, currency),
    },
  ];

  return (
    <div className="pb-4">
      {/* Price header with session state and delay label (§13). */}
      <div className="header-band bleed">
        <div className="mx-auto max-w-[1280px] px-4 py-8">
          <div className="fade-up flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-text-mid flex items-center gap-2 text-[13px]">
                <h1 className="page-title !text-[clamp(1.5rem,3vw,2rem)]">
                  {meta?.name ?? sym}
                </h1>
                <span className="tnum">{sym}</span>
                {meta ? <span className="text-text-low">· {meta.exchange}</span> : null}
              </div>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="tnum text-text-hi text-[34px]">
                  {formatMoney(quote.priceUsd, currency)}
                </span>
                <span
                  className={`tnum flex items-center gap-1.5 text-[15px] ${dirClass}`}
                >
                  <span aria-hidden>{directionGlyph(quote.change)}</span>
                  {formatMoney(Math.abs(quote.change), currency)}
                  <span className="text-text-mid">·</span>
                  {formatPercent(quote.changePct)}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] ${
                  session.state === "open"
                    ? "border-gain/40 dir-gain bg-gain/10"
                    : "border-line text-text-mid"
                }`}
              >
                {session.state === "open" ? (
                  <span className="live-dot" aria-hidden />
                ) : null}
                {session.label}
              </span>
              <QuoteProvenance quote={quote} className="mt-1.5" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div
          className="fade-up lg:col-span-8"
          style={{ "--d": "80ms" } as React.CSSProperties}
        >
          <div className="card p-4">
            <PriceChart symbol={sym} />
          </div>

          <h2 className="text-text-mid mt-8 mb-2.5 text-[13px] font-medium">
            Key statistics
          </h2>
          <dl className="list-card grid grid-cols-2 sm:grid-cols-3">
            {stats.map((s) => (
              <div
                key={s.label}
                className="border-line border-r border-b px-3.5 py-3 [&:nth-child(2n)]:border-r-0 sm:[&:nth-child(2n)]:border-r sm:[&:nth-child(3n)]:border-r-0"
              >
                <dt className="text-text-low text-[12px]">{s.label}</dt>
                <dd className="tnum text-text-hi mt-0.5 text-[15px]">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <aside
          className="fade-up lg:col-span-4"
          style={{ "--d": "160ms" } as React.CSSProperties}
        >
          {/* Computed "how it moved" block — deterministic prose from our candles (§9). */}
          <div className="card overflow-hidden p-5">
            <div className="ours border-iris/25 bg-iris/10 relative inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12px]">
              <span aria-hidden>◆</span>
              <span>How it moved · computed</span>
            </div>
            <p className="font-editorial text-text-hi relative mt-3 text-[15px] leading-[1.6]">
              {recap.bodyMd}
            </p>
            <p className="text-text-low relative mt-3 text-[11px]">
              Generated from our own price data ·{" "}
              <a href="/methodology" className="ours">
                methodology
              </a>
            </p>
          </div>

          <h2 className="text-text-mid mt-8 mb-2.5 text-[13px] font-medium">
            Related coverage
          </h2>
          {coverage.length > 0 ? (
            <ul className="list-card divide-line divide-y">
              {coverage.map((c) => (
                <li key={c.slug} className="p-3.5">
                  <Link href={`/news/${c.slug}`} className="group block">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                      <span className="text-text-mid inline-flex items-center gap-1 tracking-wide uppercase">
                        <span
                          aria-hidden
                          className="inline-block h-1.5 w-1.5 rounded-full"
                          style={{ background: sectionMeta(c.section).hue }}
                        />
                        {sectionMeta(c.section).label}
                      </span>
                      <span className="ours tnum">◆ {c.importanceScore}</span>
                      <span className="text-text-low">
                        {c.sourceCount} {c.sourceCount === 1 ? "source" : "sources"}
                      </span>
                      <span className="text-text-low">
                        · {relativeTime(c.eventTime)}
                      </span>
                    </div>
                    <h3 className="font-editorial text-text-hi group-hover:text-iris mt-1 text-[14px] leading-snug">
                      {c.title}
                    </h3>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="card text-text-low px-3 py-8 text-center text-[13px]">
              News clusters bound to <span className="tnum text-text-mid">{sym}</span>{" "}
              surface here as the wire picks up coverage.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
