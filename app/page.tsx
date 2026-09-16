import Link from "next/link";
import { getDisplayCurrency } from "@/lib/currency/server";
import { readMovers } from "@/lib/market/read";
import { readWire } from "@/lib/news/read";
import { listRecaps } from "@/lib/narrative/read";
import { formatMoney } from "@/lib/format/currency";
import { directionGlyph, directionOf, formatPercent } from "@/lib/format/percent";

/**
 * The Board (§13). Editorial hero + honest stat row + the session's lead cluster
 * beside its instrument + what Mizan does. Chrome is monochrome; the iris accent
 * marks only our own computed content (source counts, scores, recaps).
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
  const leadTicker = lead?.tickers[0];
  const leadMover = movers.find((m) => m.symbol === leadTicker) ?? movers[0];
  const sessionRecap = listRecaps(currency).find((r) => r.kind === "session_close");

  return (
    <div className="py-12 sm:py-16">
      {/* Hero */}
      <section className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-8">
        <div className="hero-glow lg:col-span-7">
          <div
            className="fade-up flex items-center gap-2"
            style={{ "--d": "0ms" } as React.CSSProperties}
          >
            <span className="live-dot" aria-hidden />
            <span className="eyebrow">signal over noise · GCC + global markets</span>
          </div>
          <h1
            className="font-editorial fade-up text-text-hi mt-5 text-[42px] leading-[1.02] sm:text-[60px]"
            style={{ "--d": "60ms" } as React.CSSProperties}
          >
            The market, weighted by{" "}
            <span className="ours-grad">what actually moves it.</span>
          </h1>
          <p
            className="fade-up text-text-mid mt-6 max-w-[52ch] text-[16px] leading-relaxed"
            style={{ "--d": "120ms" } as React.CSSProperties}
          >
            Mizan ranks which stories matter, binds them to the instruments they move,
            and shows how markets responded — computed deterministically from data we
            hold, in USD or QAR. Not a wire. Not AI-written analysis.
          </p>
          <div
            className="fade-up mt-8 flex flex-wrap items-center gap-3"
            style={{ "--d": "180ms" } as React.CSSProperties}
          >
            <Link href="/news" className="btn btn-primary">
              Explore the wire
              <span aria-hidden>→</span>
            </Link>
            <Link href="/markets" className="btn btn-ghost">
              Open markets
            </Link>
          </div>
        </div>

        {/* Lead cluster beside its instrument (§13). */}
        <div
          className="fade-up lg:col-span-5"
          style={{ "--d": "240ms" } as React.CSSProperties}
        >
          {lead ? (
            <Link
              href={`/news/${lead.slug}`}
              className="card card-hover block overflow-hidden p-5"
            >
              <div className="relative">
                <div className="flex items-center gap-2 text-[12px]">
                  <span className="ours tnum border-iris/30 bg-iris/10 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5">
                    ◆ {lead.importanceScore}
                  </span>
                  <span className="ours tnum">{lead.sourceCount} sources</span>
                  <span className="text-text-low ml-auto">session lead</span>
                </div>
                <h2 className="font-editorial text-text-hi mt-3 text-[22px] leading-snug">
                  {lead.title}
                </h2>
                {leadMover ? (
                  <div className="border-line mt-5 flex items-center justify-between border-t pt-4">
                    <span className="text-text-mid text-[12px]">
                      {leadMover.name} · {leadMover.symbol}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="tnum text-text-hi text-[16px]">
                        {formatMoney(leadMover.priceUsd, currency)}
                      </span>
                      <span
                        className={`tnum flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] ${
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
                    </span>
                  </div>
                ) : null}
              </div>
            </Link>
          ) : null}
        </div>
      </section>

      {/* Computed session recap — our own prose, accent-marked (§9, §11). */}
      {sessionRecap ? (
        <section className="fade-up card mt-16 overflow-hidden p-6 sm:p-8">
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

      {/* Stat row — elevated cards, iris numbers. */}
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
    </div>
  );
}
