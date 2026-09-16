import Link from "next/link";
import { HeroBackdrop } from "@/components/layout/HeroBackdrop";
import { CoverArt } from "@/components/news/CoverArt";
import { SectionTag } from "@/components/news/SectionTag";
import { getDisplayCurrency } from "@/lib/currency/server";
import { isFinancialSection } from "@/lib/curation/section";
import { readMovers } from "@/lib/market/read";
import { readWire } from "@/lib/news/read";
import { listRecaps } from "@/lib/narrative/read";
import { directionGlyph, directionOf, formatPercent } from "@/lib/format/percent";

/**
 * The Board (§13). A cinematic full-bleed hero over a market-data backdrop, then
 * the session recap, honest stat row and what Mizan does. Chrome is monochrome;
 * the iris accent marks only our own computed content.
 */

const STATS: { value: string; sup?: string; label: string }[] = [
  { value: "2", label: "rails — global markets + a dedicated GCC / Qatar module" },
  {
    value: "10",
    sup: "min",
    label: "wire refresh, ranked by independent source count",
  },
  { value: "USD·QAR", label: "dual currency, everywhere, persistently" },
  { value: "0", label: "third-party article bodies stored — headlines and links only" },
];

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
  const [currency, clusters, movers] = await Promise.all([
    getDisplayCurrency(),
    readWire(),
    readMovers(4),
  ]);
  const lead = clusters[0];
  const beyond = clusters.filter((c) => !isFinancialSection(c.section)).slice(0, 3);
  const leadTicker = lead?.tickers[0];
  const leadMover = movers.find((m) => m.symbol === leadTicker) ?? movers[0];
  const sessionRecap = listRecaps(currency).find((r) => r.kind === "session_close");

  return (
    <div>
      {/* Cinematic full-bleed hero over a market-data backdrop. */}
      <section className="bleed relative isolate overflow-hidden">
        <HeroBackdrop />
        <div className="hero-scrim" />
        <div className="relative mx-auto flex min-h-[82vh] max-w-[1180px] flex-col items-center justify-center px-4 py-24 text-center sm:py-28">
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
            <Link href="/methodology" className="btn btn-ghost">
              How it works
            </Link>
          </div>

          {/* Compact live session-lead strip — keeps a real data hook in the hero. */}
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
              <span className="text-text-low shrink-0" aria-hidden>
                →
              </span>
            </Link>
          ) : null}

          {/* Honest "powered by" strip (ref: Alula) — real providers only. */}
          <div
            className="fade-up mt-14 flex flex-col items-center gap-3"
            style={{ "--d": "380ms" } as React.CSSProperties}
          >
            <span className="eyebrow">Market &amp; macro data from</span>
            <div className="trust-strip justify-center">
              {["FMP", "Polygon", "EODHD", "FRED", "World Bank"].map((p) => (
                <span key={p} className="trust-logo">
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="pb-4">
        {/* Computed session recap. */}
        {sessionRecap ? (
          <section className="card mt-14 overflow-hidden p-6 sm:p-8">
            <Link href={`/recap/${sessionRecap.slug}`} className="relative block">
              <div className="ours flex items-center gap-2 text-[12px]">
                <span aria-hidden>◆</span>
                <span>Session recap · computed from market data</span>
              </div>
              <p className="font-editorial text-text-hi mt-3 max-w-[72ch] text-[20px] leading-[1.6]">
                {sessionRecap.output.bodyMd}
              </p>
              <span className="ours mt-3 inline-flex items-center gap-1 text-[12px]">
                Read the full recap <span aria-hidden>→</span>
              </span>
            </Link>
          </section>
        ) : null}

        {/* Stat row. */}
        <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="card card-hover p-5">
              <div className="tnum text-text-hi relative flex items-baseline gap-0.5 text-[36px] leading-none">
                {s.value}
                {s.sup ? <span className="ours text-[15px]">{s.sup}</span> : null}
              </div>
              <p className="text-text-low relative mt-2.5 text-[12px] leading-snug">
                {s.label}
              </p>
            </div>
          ))}
        </section>

        {/* What Mizan does. */}
        <section className="mt-16">
          <div className="flex items-center gap-2">
            <span className="bg-line-strong h-px w-6" aria-hidden />
            <p className="eyebrow">what mizan ships that the wires don&rsquo;t</p>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="card card-hover fade-up flex flex-col p-6"
                style={{ "--d": `${i * 80}ms` } as React.CSSProperties}
              >
                <div className="relative flex items-start justify-between">
                  <span
                    className="ours border-iris/30 bg-iris/10 flex h-9 w-9 items-center justify-center rounded-xl border text-[15px]"
                    aria-hidden
                  >
                    ◆
                  </span>
                  <span className="text-text-low text-[14px]" aria-hidden>
                    ↗
                  </span>
                </div>
                <h3 className="font-editorial text-text-hi relative mt-4 text-[20px] leading-snug">
                  {f.title}
                </h3>
                <p className="text-text-mid relative mt-2 text-[13px] leading-relaxed">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Beyond the markets (§13) — the deliberate non-financial mix. */}
        {beyond.length > 0 ? (
          <section className="mt-16">
            <div className="flex items-end justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="bg-line-strong h-px w-6" aria-hidden />
                <p className="eyebrow">beyond the markets</p>
              </div>
              <Link href="/sections" className="ours text-[12px]">
                All sections <span aria-hidden>→</span>
              </Link>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
              {beyond.map((c, i) => (
                <Link
                  key={c.slug}
                  href={`/news/${c.slug}`}
                  className="card card-hover fade-up flex flex-col overflow-hidden"
                  style={{ "--d": `${i * 80}ms` } as React.CSSProperties}
                >
                  <div className="border-line bg-surface aspect-[16/8] w-full overflow-hidden border-b">
                    <CoverArt
                      section={c.section}
                      seed={c.slug}
                      imageUrl={c.imageUrl}
                      className="h-full w-full"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-center gap-2 text-[12px]">
                      <SectionTag section={c.section} />
                      <span className="ours tnum ml-auto">
                        {c.sourceCount} {c.sourceCount === 1 ? "source" : "sources"}
                      </span>
                    </div>
                    <h3 className="font-editorial text-text-hi mt-3 text-[18px] leading-snug">
                      {c.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
