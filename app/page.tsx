import Link from "next/link";
import { HeroBackdrop } from "@/components/layout/HeroBackdrop";
import { Movers } from "@/components/market/Movers";
import { StoryCard } from "@/components/news/StoryCard";
import { getDisplayCurrency } from "@/lib/currency/server";
import {
  allSections,
  readSectionSummaries,
  readWire,
  type WireCluster,
} from "@/lib/news/read";
import { listRecaps } from "@/lib/narrative/read";
import { directionGlyph, directionOf, formatPercent } from "@/lib/format/percent";
import { readMovers } from "@/lib/market/read";

/**
 * The Board (§13). A cinematic hero, then a real multi-band publication:
 * top stories, a markets snapshot, per-section rails, the computed recap, and an
 * honest "how it works" band. Tonal bands (canvas ↔ surface) give the page white
 * space and rhythm; the iris accent still marks only our own computed content.
 */

const FEATURES: { title: string; body: string }[] = [
  {
    title: "Source-count as signal",
    body: "Every story shows how many independent outlets cover it. That number is the ranking, made visible — not an undifferentiated firehose.",
  },
  {
    title: "News-to-price adjacency",
    body: "Every cluster is bound to the instruments it concerns, with the live move rendered right alongside the coverage.",
  },
  {
    title: "Computed recaps",
    body: "Session recaps written from our own numbers by a deterministic engine — factual, original, and clearly marked as ours.",
  },
];

export default async function BoardPage() {
  const [currency, clusters, movers, summary] = await Promise.all([
    getDisplayCurrency(),
    readWire(),
    readMovers(4),
    readSectionSummaries(),
  ]);

  const lead = clusters[0];
  const railTop = clusters.slice(1, 5);
  const secondary = clusters.slice(5, 8);
  const leadTicker = lead?.tickers[0];
  const leadMover = movers.find((m) => m.symbol === leadTicker) ?? movers[0];
  const sessionRecap = listRecaps(currency).find((r) => r.kind === "session_close");

  const bySection = new Map<string, WireCluster[]>();
  for (const c of clusters) {
    const arr = bySection.get(c.section) ?? [];
    arr.push(c);
    bySection.set(c.section, arr);
  }
  const rails = allSections()
    .map((s) => ({ section: s, stories: bySection.get(s.id) ?? [] }))
    .filter((r) => r.stories.length >= 2)
    .slice(0, 5);

  return (
    <div>
      {/* ============ Cinematic hero ============ */}
      <section className="bleed relative isolate overflow-hidden">
        <HeroBackdrop />
        <div className="hero-scrim" />
        <div className="relative mx-auto flex min-h-[74vh] max-w-[1180px] flex-col items-center justify-center px-4 py-24 text-center sm:py-28">
          <div
            className="hero-badge fade-up"
            style={{ "--d": "0ms" } as React.CSSProperties}
          >
            <span className="live-dot" aria-hidden />
            Algorithmically curated market intelligence
          </div>

          <h1
            className="display fade-up text-text-hi mt-6 max-w-[15ch]"
            style={{ "--d": "70ms" } as React.CSSProperties}
          >
            The market, weighted by{" "}
            <span className="ours-grad">what actually moves it.</span>
          </h1>

          <p
            className="fade-up text-text-mid mx-auto mt-7 max-w-[58ch] text-[17px] leading-relaxed"
            style={{ "--d": "140ms" } as React.CSSProperties}
          >
            Mizan ranks which stories matter, binds them to the instruments they move,
            and shows how markets responded — computed deterministically from data we
            hold, in USD or QAR. Not a wire. Not AI-written analysis.
          </p>

          <div
            className="fade-up mt-9 flex flex-wrap items-center justify-center gap-3"
            style={{ "--d": "210ms" } as React.CSSProperties}
          >
            <Link href="/news" className="btn btn-primary">
              Explore the wire <span aria-hidden>→</span>
            </Link>
            <Link href="/sections" className="btn btn-ghost">
              Browse sections
            </Link>
          </div>

          {lead ? (
            <Link
              href={`/news/${lead.slug}`}
              className="glass card-hover fade-up mt-11 flex w-full max-w-[640px] items-center gap-3 px-4 py-3 text-left"
              style={{ "--d": "300ms" } as React.CSSProperties}
            >
              <span className="ours tnum border-iris/30 bg-iris/10 inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[12px]">
                ◆ {lead.importanceScore}
              </span>
              <span className="text-text-low hidden shrink-0 text-[11px] tracking-wide uppercase sm:inline">
                Session lead
              </span>
              <span className="text-text-hi truncate text-[14px]">{lead.title}</span>
              {leadMover ? (
                <span
                  className={`tnum ml-auto flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] ${
                    directionOf(leadMover.change) === "gain"
                      ? "dir-gain bg-gain/10"
                      : directionOf(leadMover.change) === "loss"
                        ? "dir-loss bg-loss/10"
                        : "text-text-mid"
                  }`}
                >
                  <span aria-hidden>{directionGlyph(leadMover.change)}</span>
                  {formatPercent(leadMover.changePct)}
                </span>
              ) : null}
            </Link>
          ) : null}

          <div
            className="fade-up mt-14 flex flex-col items-center gap-3"
            style={{ "--d": "380ms" } as React.CSSProperties}
          >
            <span className="eyebrow">Market &amp; macro data from</span>
            <div className="trust-strip justify-center">
              {["FMP", "Finnhub", "Polygon", "FRED", "World Bank", "Pexels"].map(
                (p) => (
                  <span key={p} className="trust-logo">
                    {p}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ============ Top stories ============ */}
      {lead ? (
        <section className="section-y">
          <div className="rail-head">
            <span className="rail-title">Top stories</span>
            <Link href="/news" className="ours text-[13px]">
              The wire <span aria-hidden>→</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <StoryCard cluster={lead} variant="lead" />
            </div>
            <div className="list-card divide-line divide-y px-4 lg:col-span-5">
              {railTop.map((c) => (
                <StoryCard key={c.slug} cluster={c} variant="compact" />
              ))}
            </div>
          </div>
          {secondary.length > 0 ? (
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {secondary.map((c) => (
                <StoryCard key={c.slug} cluster={c} variant="card" />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* ============ Markets snapshot (surface band) ============ */}
      <section className="bleed band">
        <div className="wrap section-y-sm">
          <div className="rail-head">
            <span className="rail-title">Markets snapshot</span>
            <Link href="/markets" className="ours text-[13px]">
              All markets <span aria-hidden>→</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <Movers currency={currency} />
            </div>
            <div className="card flex flex-col justify-center p-6 lg:col-span-5">
              <p className="eyebrow">news-to-price</p>
              <p className="font-editorial text-text-hi mt-3 text-[20px] leading-snug">
                Every story is bound to the instruments it concerns — so you see the
                move next to the coverage, not in a separate tab.
              </p>
              <div className="mt-5 flex gap-3">
                <Link href="/markets/screener" className="btn btn-ghost text-[13px]">
                  Screener
                </Link>
                <Link href="/economy" className="btn btn-ghost text-[13px]">
                  Economy
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ Section rails ============ */}
      <section className="section-y">
        <div className="rail-head">
          <span className="rail-title">Across the sections</span>
          <Link href="/sections" className="ours text-[13px]">
            All sections · {summary.nonFinancialPct}% beyond markets{" "}
            <span aria-hidden>→</span>
          </Link>
        </div>
        <div className="flex flex-col gap-12">
          {rails.map(({ section, stories }) => (
            <div key={section.id}>
              <div className="mb-4 flex items-center justify-between">
                <Link
                  href={`/news?section=${section.id}`}
                  className="group inline-flex items-center gap-2"
                >
                  <span
                    aria-hidden
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: section.hue }}
                  />
                  <span className="text-text-hi group-hover:text-iris text-[15px] font-medium transition-colors">
                    {section.label}
                  </span>
                  <span className="text-text-low text-[12px]">{section.blurb}</span>
                </Link>
                <Link
                  href={`/news?section=${section.id}`}
                  className="text-text-low hover:text-iris text-[12px]"
                >
                  View all <span aria-hidden>→</span>
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {stories.slice(0, 3).map((c) => (
                  <StoryCard key={c.slug} cluster={c} variant="card" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ Computed recap (ours band) ============ */}
      {sessionRecap ? (
        <section className="bleed band-ours">
          <div className="wrap section-y-sm">
            <Link href={`/recap/${sessionRecap.slug}`} className="relative block">
              <div className="ours flex items-center gap-2 text-[12px]">
                <span aria-hidden>◆</span>
                <span>Session recap · computed from market data</span>
              </div>
              <p className="font-editorial text-text-hi mt-3 max-w-[72ch] text-[22px] leading-[1.6]">
                {sessionRecap.output.bodyMd}
              </p>
              <span className="ours mt-4 inline-flex items-center gap-1 text-[13px]">
                Read the full recap <span aria-hidden>→</span>
              </span>
            </Link>
          </div>
        </section>
      ) : null}

      {/* ============ How it works (honest) ============ */}
      <section className="section-y">
        <div className="rail-head">
          <span className="rail-title">
            What Mizan ships that the wires don&rsquo;t
          </span>
          <Link href="/methodology" className="ours text-[13px]">
            Methodology <span aria-hidden>→</span>
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="card card-hover flex flex-col p-6"
              style={{ "--d": `${i * 80}ms` } as React.CSSProperties}
            >
              <span
                className="ours border-iris/30 bg-iris/10 flex h-9 w-9 items-center justify-center rounded-xl border text-[15px]"
                aria-hidden
              >
                ◆
              </span>
              <h3 className="font-editorial text-text-hi mt-4 text-[20px] leading-snug">
                {f.title}
              </h3>
              <p className="text-text-mid mt-2 text-[13px] leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
