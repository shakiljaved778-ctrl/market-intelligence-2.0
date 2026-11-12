import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import dynamic from "next/dynamic";
import { ChangePill } from "@/components/market/ChangePill";
import { NoData, PriceStamp } from "@/components/market/Provenance";
import { FundamentalsPanel } from "@/components/market/Fundamentals";
import { getDisplayCurrency } from "@/lib/currency/server";
import { readCandles, readFundamentals } from "@/lib/market/read";
import { getQuote } from "@/lib/market/service";
import { instrumentBySymbol } from "@/content/instruments";
import { readWire } from "@/lib/news/read";
import { sectionMeta } from "@/lib/curation/section";
import { deriveInstrumentRecap } from "@/lib/narrative/derive";
import { instrumentRecap } from "@/lib/narrative/recap";
import { formatCompactMoney, formatMoney } from "@/lib/format/currency";
import { relativeTime } from "@/lib/format/relative-time";
import { sessionFor } from "@/lib/format/session";
import { breadcrumbLd, canonical, corporationLd, graph, ogImage } from "@/lib/seo";
import { exchangeMeta, gccCompany, gccSectorPeers } from "@/lib/market/gcc";
import { GccCompanyView } from "@/components/market/GccCompanyView";

// lightweight-charts is heavy; code-split it out of the main bundle (§8). SSR is
// kept, so the rendered output is identical.
const PriceChart = dynamic(() =>
  import("@/components/chart/PriceChart").then((m) => m.PriceChart),
);

interface Params {
  params: Promise<{ symbol: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { symbol } = await params;
  const sym = symbol.toUpperCase();

  // GCC company pages (Phase 5): index only with a real price AND a profile or a
  // related story; otherwise noindex (never an invented price).
  const gcc = gccCompany(sym);
  if (gcc) {
    const ex = exchangeMeta(gcc.exchange);
    // Only a REAL quote counts — a GCC page is indexable only with a real price.
    const p = await getQuote(sym);
    const quote = p.value && !p.demo ? p.value : null;
    const related = await readWire({ ticker: sym });
    const indexable = Boolean(quote) && (Boolean(gcc.profile) || related.length > 0);
    const title = `${gcc.nameEn} (${sym}) Share Price Today | ${ex?.shortName ?? "GCC"}`;
    return {
      title,
      description: `${gcc.nameEn} (${sym}) on the ${ex?.name ?? "GCC exchange"} — share price, company profile and the latest Mizaan coverage. ${quote ? "Price shown with its source and time." : "No licensed price feed yet."}`,
      alternates: { canonical: canonical(`/quote/${sym}`) },
      robots: indexable ? undefined : { index: false, follow: true },
    };
  }

  const meta = instrumentBySymbol(sym);
  const name = meta?.name ?? sym;
  const title = `${name} (${sym}) Share Price, News & Chart`;
  const description = `${name} (${sym}): latest stored price with its source and time, price chart and Mizaan news coverage.`;
  const url = canonical(`/quote/${sym}`);
  const image = ogImage(`${name} (${sym})`, "quote");
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title,
      description,
      url,
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, images: [image] },
  };
}

export default async function QuotePage({ params }: Params) {
  const { symbol } = await params;
  const sym = symbol.toUpperCase();
  const [pricedQuote, currency] = await Promise.all([
    getQuote(sym),
    getDisplayCurrency(),
  ]);
  const quote = pricedQuote.value;

  // GCC company pages (Phase 5): a dedicated profile/peers/coverage view in the
  // same layout. Price block shows only when a real quote exists. Non-GCC symbols
  // fall through to the unchanged universe path below.
  const gcc = gccCompany(sym);
  if (gcc) {
    // GCC is real-or-hidden: a demo value never stands in for a GCC price.
    const realQuote = quote && !pricedQuote.demo ? quote : null;
    const [related, peers] = [
      (await readWire({ ticker: sym })).slice(0, 6),
      gccSectorPeers(gcc, 5),
    ];
    const ex = exchangeMeta(gcc.exchange);
    const jsonLd = graph(
      breadcrumbLd([
        { name: "Home", path: "/" },
        { name: "Markets", path: "/markets" },
        { name: ex?.shortName ?? gcc.exchange, path: `/markets/${gcc.exchange}` },
        { name: gcc.nameEn, path: `/quote/${sym}` },
      ]),
      corporationLd({ name: gcc.nameEn, ticker: sym, url: canonical(`/quote/${sym}`) }),
    );
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <GccCompanyView
          company={gcc}
          quote={realQuote}
          currency={currency}
          peers={peers}
          related={related}
        />
      </>
    );
  }

  const meta = instrumentBySymbol(sym);
  // Unknown symbol → 404. A KNOWN instrument with no stored price keeps its
  // page (name, chart area, coverage) and says plainly that no price is held.
  if (!quote && !meta) notFound();
  if (!quote) {
    const coverage = (await readWire({ ticker: sym })).slice(0, 6);
    return (
      <div className="pb-4">
        <div className="header-band bleed">
          <div className="mx-auto max-w-[1280px] px-4 py-8">
            <div className="text-ink-2 flex items-center gap-2 text-[13px]">
              <h1 className="t-h3 font-editorial text-ink">{meta?.name ?? sym}</h1>
              <span className="tnum text-ink-3">{sym}</span>
              {meta ? <span className="text-ink-4">· {meta.exchange}</span> : null}
            </div>
          </div>
        </div>
        <div className="mt-6">
          <NoData>
            No price is available for {meta?.name ?? sym} right now. Mizaan shows a
            price only when its data feed has delivered one, with its source and time.
          </NoData>
        </div>
        {coverage.length > 0 ? (
          <>
            <h2 className="text-text-mid mt-8 mb-2.5 text-[13px] font-medium">
              Related coverage
            </h2>
            <ul className="list-card divide-line divide-y">
              {coverage.map((c) => (
                <li key={c.slug} className="p-3.5">
                  <Link
                    href={`/news/${c.slug}`}
                    className="font-editorial text-text-hi hover:text-iris text-[14px] leading-snug"
                  >
                    {c.title}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    );
  }

  const session = sessionFor(meta?.exchange ?? null);

  // Fundamentals (equities only) — stored values, or nothing.
  const fundamentals = await readFundamentals(sym);

  // News clusters bound to this instrument, newest-ranked first.
  const coverage = (await readWire({ ticker: sym })).slice(0, 6);

  // Computed "how it moved" recap — deterministic, from STORED daily closes
  // (§9). With fewer than five stored closes there is nothing to derive, so the
  // block is omitted rather than written from a generated series.
  const candles = await readCandles(sym, "6M");
  const recap =
    candles.length >= 5
      ? instrumentRecap(
          deriveInstrumentRecap(meta?.name ?? sym, currency, quote, candles),
        )
      : null;

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

  // BreadcrumbList + Corporation structured data (§6 SEO).
  const jsonLd = graph(
    breadcrumbLd([
      { name: "Home", path: "/" },
      { name: "Markets", path: "/markets" },
      { name: meta?.name ?? sym, path: `/quote/${sym}` },
    ]),
    corporationLd({
      name: meta?.name ?? sym,
      ticker: sym,
      url: canonical(`/quote/${sym}`),
    }),
  );

  return (
    <div className="pb-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Price header with session state and delay label (§13). */}
      <div className="header-band bleed">
        <div className="mx-auto max-w-[1280px] px-4 py-8">
          <div className="fade-up flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-ink-2 flex items-center gap-2 text-[13px]">
                <h1 className="t-h3 font-editorial text-ink">{meta?.name ?? sym}</h1>
                <span className="tnum text-ink-3">{sym}</span>
                {meta ? <span className="text-ink-4">· {meta.exchange}</span> : null}
              </div>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="tnum text-ink text-[clamp(2.5rem,6vw,4rem)] leading-none font-medium">
                  {formatMoney(quote.priceUsd, currency)}
                </span>
                <ChangePill pct={quote.changePct} className="text-[18px]" />
              </div>
            </div>
            <div className="text-right">
              <span
                className={`inline-flex items-center gap-1.5 rounded-[6px] border px-2.5 py-1 text-[12px] ${
                  session.state === "open"
                    ? "border-up/40 text-up bg-up-soft"
                    : "border-hairline text-ink-2"
                }`}
              >
                {session.state === "open" ? (
                  <span className="live-dot" aria-hidden />
                ) : null}
                {session.label}
              </span>
              <PriceStamp stamp={pricedQuote} withYear className="mt-1.5 block" />
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

          {fundamentals ? <FundamentalsPanel data={fundamentals} /> : null}
        </div>

        <aside
          className="fade-up lg:col-span-4"
          style={{ "--d": "160ms" } as React.CSSProperties}
        >
          {/* Computed "how it moved" block — deterministic prose from our candles (§9). */}
          {recap ? (
            <div className="card overflow-hidden p-5">
              <div className="ours border-iris/25 bg-iris/10 relative inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12px]">
                <span aria-hidden>◆</span>
                <span>How it moved · computed</span>
              </div>
              <p className="font-editorial text-text-hi relative mt-3 text-[15px] leading-[1.6]">
                {recap.bodyMd}
              </p>
              <p className="text-text-low relative mt-3 text-[11px]">
                Computed from stored daily closes ·{" "}
                <a href="/methodology" className="ours">
                  methodology
                </a>
              </p>
            </div>
          ) : null}

          <h2
            className={`text-text-mid mb-2.5 text-[13px] font-medium ${recap ? "mt-8" : ""}`}
          >
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
