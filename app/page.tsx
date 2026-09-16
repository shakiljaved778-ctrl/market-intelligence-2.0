import Link from "next/link";
import { getDisplayCurrency } from "@/lib/currency/server";
import { readMovers } from "@/lib/market/read";
import { readWire } from "@/lib/news/read";
import { formatMoney } from "@/lib/format/currency";
import { directionGlyph, directionOf, formatPercent } from "@/lib/format/percent";

/**
 * The Board (§13). Editorial hero + honest stat row + the session's lead cluster
 * beside its instrument + what Mizan does. Chrome is monochrome; the iris accent
 * marks only our own computed content (source counts, scores, recaps).
 */

const STATS: { value: string; sup?: string; label: string }[] = [
  { value: "2", label: "rails · global markets + a dedicated GCC/Qatar rail" },
  {
    value: "10",
    sup: "min",
    label: "wire refresh, ranked by independent source count",
  },
  { value: "USD·QAR", label: "dual currency, everywhere, persistently" },
  { value: "0", label: "article bodies stored — headlines, deks and links only" },
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
  const leadTicker = lead?.tickers[0];
  const leadMover = movers.find((m) => m.symbol === leadTicker) ?? movers[0];

  return (
    <div className="py-10 sm:py-14">
      {/* Hero */}
      <section className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-6">
        <div className="lg:col-span-7">
          <p className="eyebrow">signal over noise · GCC + global</p>
          <h1 className="font-editorial text-text-hi mt-4 text-[40px] leading-[1.03] sm:text-[56px]">
            The market, weighted by{" "}
            <span className="ours">what actually moves it.</span>
          </h1>
          <p className="text-text-mid mt-5 max-w-[54ch] text-[15px] leading-relaxed">
            Mizan ranks which stories matter, binds them to the instruments they move,
            and shows how markets responded — computed deterministically from data we
            hold, in USD or QAR. Not a wire. Not AI-written analysis.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/news"
              className="pill inline-flex items-center gap-2 px-5 py-2.5 text-[14px]"
              style={{ background: "var(--text-hi)", color: "var(--canvas)" }}
            >
              Explore the wire
            </Link>
            <Link
              href="/markets"
              className="pill border-line text-text-hi hover:bg-surface border px-5 py-2.5 text-[14px]"
            >
              Open markets
            </Link>
          </div>
        </div>

        {/* Lead cluster beside its instrument (§13). */}
        <div className="lg:col-span-5">
          {lead ? (
            <Link
              href={`/news/${lead.slug}`}
              className="border-line bg-surface hover:bg-raised block border p-5 transition-colors"
            >
              <div className="eyebrow flex items-center gap-3">
                <span className="ours">◆ {lead.importanceScore}</span>
                <span className="ours">{lead.sourceCount} sources</span>
                <span>session lead</span>
              </div>
              <h2 className="font-editorial text-text-hi mt-3 text-[21px] leading-snug">
                {lead.title}
              </h2>
              {leadMover ? (
                <div className="border-line mt-4 flex items-center justify-between border-t pt-3">
                  <span className="text-text-mid text-[12px]">
                    {leadMover.name} · {leadMover.symbol}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="tnum text-text-hi text-[15px]">
                      {formatMoney(leadMover.priceUsd, currency)}
                    </span>
                    <span
                      className={`tnum flex items-center gap-1 text-[12px] ${
                        directionOf(leadMover.change) === "gain"
                          ? "dir-gain"
                          : directionOf(leadMover.change) === "loss"
                            ? "dir-loss"
                            : "text-text-mid"
                      }`}
                    >
                      <span aria-hidden>{directionGlyph(leadMover.change)}</span>
                      {formatPercent(leadMover.changePct)}
                    </span>
                  </span>
                </div>
              ) : null}
            </Link>
          ) : null}
        </div>
      </section>

      {/* Stat row — big tokens, mono labels (§12). */}
      <section className="border-line bg-line mt-14 grid grid-cols-2 gap-px border lg:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="bg-canvas p-5">
            <div className="tnum text-text-hi flex items-baseline gap-0.5 text-[34px] leading-none">
              {s.value}
              {s.sup ? <span className="ours text-[15px]">{s.sup}</span> : null}
            </div>
            <p className="text-text-low mt-2 text-[12px] leading-snug">{s.label}</p>
          </div>
        ))}
      </section>

      {/* What Mizan does — alternating raised cards, one corner mark (not on link text). */}
      <section className="mt-14">
        <p className="eyebrow">what mizan ships that the wires don&rsquo;t</p>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={`border-line flex flex-col border p-5 ${
                i === 1 ? "bg-raised" : "bg-surface"
              }`}
            >
              <div className="flex items-start justify-between">
                <span className="ours text-[13px]" aria-hidden>
                  ◆
                </span>
                <span className="text-text-low text-[13px]" aria-hidden>
                  ↗
                </span>
              </div>
              <h3 className="font-editorial text-text-hi mt-3 text-[19px] leading-snug">
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
