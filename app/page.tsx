import Link from "next/link";
import { canonical } from "@/lib/seo";
import { CoverArt } from "@/components/news/CoverArt";
import { SectionTag } from "@/components/news/SectionTag";
import { StoryCard } from "@/components/news/StoryCard";
import { Movers } from "@/components/market/Movers";
import { SignalScore } from "@/components/ui/SignalScore";
import { InstrumentChip } from "@/components/ui/InstrumentChip";
import { CountUp } from "@/components/ui/CountUp";
import { ChangePill } from "@/components/market/ChangePill";
import { PriceStamp } from "@/components/market/Provenance";
import { getDisplayCurrency } from "@/lib/currency/server";
import {
  readSectionSummaries,
  readWire,
  type WireCluster,
} from "@/lib/news/read";
import { pickFeatured } from "@/lib/news/featured";
import { buildHomepage } from "@/lib/news/homepage";
import { listRecaps } from "@/lib/narrative/read";
import { relativeTime } from "@/lib/format/relative-time";
import { readGccIndices, type IndexLevel } from "@/lib/market/indices";

function StatTile({
  value,
  suffix,
  label,
}: {
  value: number;
  suffix?: string;
  label: string;
}) {
  return (
    <div className="border-hairline bg-surface rounded-[8px] border p-4">
      <div className="text-signal-strong text-[30px] leading-none font-medium">
        <CountUp value={value} suffix={suffix} />
      </div>
      <p className="text-ink-3 mt-2 text-[12px] leading-snug">{label}</p>
    </div>
  );
}

function LatestRow({ c }: { c: WireCluster }) {
  return (
    <Link
      href={`/news/${c.slug}`}
      className="group hover:bg-surface-2 -mx-2 block rounded-[6px] px-2 py-3 transition-colors"
    >
      <div className="flex items-center gap-2 text-[11px]">
        <span className="text-ink-3 tnum">{relativeTime(c.eventTime)}</span>
        <SectionTag section={c.section} />
      </div>
      <h3 className="font-editorial text-ink mt-1 text-[15px] leading-snug underline-offset-2 group-hover:underline">
        {c.title}
      </h3>
    </Link>
  );
}

function GccCard({ item }: { item: IndexLevel }) {
  return (
    <div className="border-hairline bg-surface min-w-0 rounded-[8px] border p-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-ink truncate text-[14px] font-medium">{item.name}</span>
        <span className="tnum text-ink-4 text-[10px]">{item.symbol}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-x-2 gap-y-1">
        <span className="tnum text-ink text-[20px] leading-none">
          {item.level.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
        <ChangePill pct={item.changePct} className="text-[12px]" />
      </div>
      <PriceStamp stamp={item.stamp} className="mt-2 block" />
    </div>
  );
}

/** Today's date in Doha — the house timezone — e.g. "Thursday 12 November 2026". */
function dohaToday(now: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Qatar",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
    .format(now)
    .replace(",", "");
}

/** e.g. "11 Nov" for a YYYY-MM-DD session date. */
function shortDay(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return ymd;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  }).format(d);
}

const DAY_MS = 86_400_000;

export const metadata = { alternates: { canonical: canonical("/") } };

export default async function BoardPage() {
  const [currency, clusters, summary] = await Promise.all([
    getDisplayCurrency(),
    readWire(),
    readSectionSummaries(),
  ]);
  // Homepage counters — each is a plain count of what is on the wire now.
  const now = new Date();
  const ageMs = (c: WireCluster) => now.getTime() - new Date(c.eventTime).getTime();
  const last24h = clusters.filter((c) => ageMs(c) <= DAY_MS).length;
  const last7d = clusters.filter((c) => ageMs(c) <= 7 * DAY_MS).length;
  const distinctSources = new Set(clusters.flatMap((c) => c.sourceIds)).size;
  const sectionsWithStories = summary.sections.filter((s) => s.count > 0).length;

  // Slot selection lives in lib/news/homepage.ts (pure, tested): one slot per
  // story, nothing older than 72 hours in a top slot, finance leads, and
  // non-finance sections get one row each.
  const featured = pickFeatured(clusters);
  const { lead, leadLabel, heroSide, threeUp, blocks, latest } = buildHomepage(
    clusters,
    {
      now: now.getTime(),
      featured,
    },
  );
  // The latest session recap — shown only while it is recent (a week-old recap
  // is not "the session recap"). Built from real stored closes, or absent.
  const latestRecap = (await listRecaps(currency)).find(
    (r) => r.kind === "session_close",
  );
  const sessionRecap =
    latestRecap &&
    (latestRecap.demo ||
      now.getTime() - new Date(`${latestRecap.date}T00:00:00Z`).getTime() <= 4 * DAY_MS)
      ? latestRecap
      : null;
  // Real GCC index levels only — the block does not render until a licensed
  // feed supplies them.
  const gcc = await readGccIndices();

  return (
    <div>
      {/* ============ Today on Mizaan (hero + lead) ============ */}
      <section className="pt-8">
        <div className="mb-5 flex items-baseline justify-between">
          <p className="t-micro text-ink-3 inline-flex items-center gap-2">
            <span className="live-dot inline-block align-middle" aria-hidden />
            Today on Mizaan · <span data-volatile>{dohaToday(now)}</span>
          </p>
          <Link href="/news" className="text-brand text-[12px]">
            The wire <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Lead */}
          <div className="lg:col-span-8">
            {lead ? (
              <>
                <Link href={`/news/${lead.slug}`} className="group block">
                  <div className="border-hairline bg-surface aspect-[16/9] w-full overflow-hidden rounded-[8px] border">
                    <CoverArt
                      section={lead.section}
                      seed={lead.slug}
                      imageUrl={lead.imageUrl}
                      className="h-full w-full transition duration-500 group-hover:scale-[1.02]"
                    />
                  </div>
                  <div className="mt-4 flex items-center gap-3 text-[12px]">
                    {leadLabel ? (
                      <span className="border-line text-brand inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]">
                        <span aria-hidden>◆</span> {leadLabel}
                      </span>
                    ) : null}
                    <SectionTag section={lead.section} />
                    <SignalScore score={lead.importanceScore} />
                    <span className="text-signal-strong tnum">
                      {lead.sourceCount} {lead.sourceCount === 1 ? "source" : "sources"}
                    </span>
                    <span className="text-ink-3 ml-auto">
                      {relativeTime(lead.eventTime)}
                    </span>
                  </div>
                  <h1 className="t-h1 font-editorial text-ink mt-2 underline-offset-2 group-hover:underline">
                    {lead.title}
                  </h1>
                  {lead.dek ? (
                    <p className="text-ink-2 mt-3 max-w-[68ch] text-[16px] leading-relaxed">
                      {lead.dek}
                    </p>
                  ) : null}
                </Link>
                {lead.tickers.length ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {lead.tickers.slice(0, 6).map((t) => (
                      <InstrumentChip key={t} symbol={t} />
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <p className="border-hairline text-ink-3 rounded-[8px] border px-4 py-16 text-center text-[14px]">
                No new stories in the last 72 hours. The wire updates as sources
                publish.
              </p>
            )}
          </div>

          {/* Right rail: computed counters + secondary stories. */}
          <div className="lg:col-span-4">
            <div className="grid grid-cols-2 gap-3">
              <StatTile value={last24h} label="stories in the last 24 hours" />
              <StatTile value={last7d} label="stories in the last 7 days" />
              <StatTile value={distinctSources} label="sources cited on the wire" />
              <StatTile value={sectionsWithStories} label="sections with coverage" />
            </div>
            <div className="border-hairline divide-hairline mt-5 divide-y border-t">
              {heroSide.map((c) => (
                <LatestRow key={c.slug} c={c} />
              ))}
            </div>
          </div>
        </div>

        {/* 3-up row. */}
        {threeUp.length ? (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {threeUp.map((c) => (
              <StoryCard key={c.slug} cluster={c} variant="card" />
            ))}
          </div>
        ) : null}
      </section>

      {/* ============ Movers + Session recap (side by side) ============ */}
      <section className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="t-h3 font-editorial text-ink">Movers</h2>
            <Link href="/markets" className="text-brand text-[12px]">
              All markets <span aria-hidden>→</span>
            </Link>
          </div>
          <Movers currency={currency} />
        </div>
        {sessionRecap ? (
          <div className="lg:col-span-5">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="t-h3 font-editorial text-ink">Session recap</h2>
              <span className="t-micro text-ink-3">
                US close · {shortDay(sessionRecap.date)} · computed
              </span>
            </div>
            <Link
              href={`/recap/${sessionRecap.slug}`}
              className="border-hairline bg-surface hover:bg-surface-2 block h-[calc(100%-2.25rem)] rounded-[8px] border p-5 transition-colors"
            >
              <div className="text-signal-strong flex items-center gap-2 text-[12px]">
                <span aria-hidden>◆</span>
                <span>Computed from stored closing prices</span>
              </div>
              <p className="font-editorial text-ink mt-3 text-[17px] leading-[1.6]">
                {sessionRecap.output.bodyMd}
              </p>
              {sessionRecap.basis ? (
                <p className="text-ink-3 mt-2 text-[11px]">{sessionRecap.basis}</p>
              ) : null}
              <span className="text-brand mt-3 inline-flex items-center gap-1 text-[13px]">
                Read the full recap <span aria-hidden>→</span>
              </span>
            </Link>
          </div>
        ) : null}
      </section>

      {/* ============ Section blocks ============ */}
      <div className="mt-12">
        {blocks.map(({ section, stories, row }) => {
          const blockLead = stories[0]!;
          const rest = stories.slice(1, 5);
          if (row) {
            // Non-finance sections: one row of cards, with a link to the rest.
            return (
              <section key={section.id} className="border-hairline border-t py-8">
                <div className="mb-5 flex items-baseline justify-between">
                  <Link
                    href={`/news?section=${section.id}`}
                    className="group inline-flex items-center gap-2.5"
                  >
                    <span
                      aria-hidden
                      className="inline-block h-5 w-[3px] rounded-[2px]"
                      style={{ background: section.hue }}
                    />
                    <span className="t-h3 font-editorial text-ink group-hover:underline">
                      {section.label}
                    </span>
                  </Link>
                  <Link
                    href={`/news?section=${section.id}`}
                    className="text-ink-3 hover:text-brand text-[12px]"
                  >
                    View all <span aria-hidden>→</span>
                  </Link>
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {stories.map((c) => (
                    <StoryCard key={c.slug} cluster={c} variant="card" />
                  ))}
                </div>
              </section>
            );
          }
          return (
            <section key={section.id} className="border-hairline border-t py-8">
              <div className="mb-5 flex items-baseline justify-between">
                <Link
                  href={`/news?section=${section.id}`}
                  className="group inline-flex items-center gap-2.5"
                >
                  <span
                    aria-hidden
                    className="inline-block h-5 w-[3px] rounded-[2px]"
                    style={{ background: section.hue }}
                  />
                  <span className="t-h3 font-editorial text-ink group-hover:underline">
                    {section.label}
                  </span>
                </Link>
                <Link
                  href={`/news?section=${section.id}`}
                  className="text-ink-3 hover:text-brand text-[12px]"
                >
                  View all <span aria-hidden>→</span>
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                <div className="lg:col-span-5">
                  <StoryCard cluster={blockLead} variant="card" />
                </div>
                {rest.length > 0 ? (
                  <div className="border-hairline bg-surface divide-hairline rounded-[8px] border px-4 lg:col-span-7">
                    {rest.map((c) => (
                      <div
                        key={c.slug}
                        className="divide-hairline [&:not(:last-child)]:border-hairline [&:not(:last-child)]:border-b"
                      >
                        <StoryCard cluster={c} variant="compact" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <Link
                    href={`/news?section=${section.id}`}
                    className="border-hairline text-ink-2 hover:text-ink flex items-center justify-center gap-2 rounded-[8px] border px-4 py-10 text-[13px] lg:col-span-7"
                  >
                    More in{" "}
                    <span className="text-ink font-medium">{section.label}</span>
                    <span aria-hidden>→</span>
                  </Link>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* ============ GCC spotlight ============ */}
      {gcc.length ? (
        <section className="border-hairline border-t py-8">
          <div className="mb-5 flex items-baseline justify-between">
            <h2 className="t-h3 font-editorial text-ink">GCC spotlight</h2>
            <Link href="/markets" className="text-ink-3 hover:text-brand text-[12px]">
              All markets <span aria-hidden>→</span>
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {gcc.map((item) => (
              <GccCard key={item.symbol} item={item} />
            ))}
          </div>
          <p className="text-ink-4 t-micro mt-3">
            GCC indices · end of day, per exchange
          </p>
        </section>
      ) : null}

      {/* ============ Latest (time-ordered, not already shown) ============ */}
      {latest.length ? (
        <section className="border-hairline border-t py-8">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="t-h3 font-editorial text-ink">Latest</h2>
            <Link href="/news" className="text-ink-3 hover:text-brand text-[12px]">
              The wire <span aria-hidden>→</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-x-10 sm:grid-cols-2">
            {latest.map((c) => (
              <LatestRow key={c.slug} c={c} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
