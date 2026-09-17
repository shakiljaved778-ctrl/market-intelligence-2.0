import Link from "next/link";
import { CoverArt } from "@/components/news/CoverArt";
import { SectionTag } from "@/components/news/SectionTag";
import { StoryCard } from "@/components/news/StoryCard";
import { Movers } from "@/components/market/Movers";
import { getDisplayCurrency } from "@/lib/currency/server";
import { allSections, readWire, type WireCluster } from "@/lib/news/read";
import { listRecaps } from "@/lib/narrative/read";
import { relativeTime } from "@/lib/format/relative-time";

/**
 * The front page (§13). An editorial masthead in the pattern of a real news
 * front — a dominant lead, a secondary column, a "Latest" rail and In Focus —
 * then dense per-section blocks, a markets snapshot and the computed recap.
 * Distinct from the references: monochrome chrome, the iris accent marks our own
 * computed content, and story colour comes only from price direction.
 */

/** A quiet timestamped headline row for the Latest rail. */
function LatestRow({ c }: { c: WireCluster }) {
  return (
    <Link href={`/news/${c.slug}`} className="group block py-3">
      <div className="flex items-center gap-2 text-[11px]">
        <span className="text-text-low tnum">{relativeTime(c.eventTime)}</span>
        <SectionTag section={c.section} />
      </div>
      <h3 className="font-editorial text-text-hi group-hover:text-iris mt-1 text-[15px] leading-snug transition-colors">
        {c.title}
      </h3>
    </Link>
  );
}

export default async function BoardPage() {
  const [currency, clusters] = await Promise.all([getDisplayCurrency(), readWire()]);

  const lead = clusters[0];
  const secondary = clusters[1];
  const secondaryRelated = clusters.slice(2, 4);
  const leadRelated = clusters[4];
  const latest = clusters.slice(1, 9);
  const sessionRecap = listRecaps(currency).find((r) => r.kind === "session_close");

  const bySection = new Map<string, WireCluster[]>();
  for (const c of clusters) {
    const arr = bySection.get(c.section) ?? [];
    arr.push(c);
    bySection.set(c.section, arr);
  }
  const blocks = allSections()
    .map((s) => ({ section: s, stories: bySection.get(s.id) ?? [] }))
    .filter((b) => b.stories.length >= 2)
    .slice(0, 4);

  if (!lead) {
    return (
      <div className="section-y text-text-mid text-center text-[14px]">
        The wire is quiet right now.
      </div>
    );
  }

  return (
    <div>
      {/* ============ Masthead ============ */}
      <section className="border-line border-b py-6 sm:py-8">
        <div className="flex items-baseline justify-between">
          <p className="eyebrow">
            <span className="live-dot mr-2 inline-block align-middle" aria-hidden />
            Today on Mizan · {new Date(lead.eventTime).toUTCString().slice(0, 16)}
          </p>
          <Link href="/news" className="ours text-[12px]">
            The wire <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Secondary (left on desktop). */}
          {secondary ? (
            <div className="order-2 lg:order-1 lg:col-span-3">
              <Link href={`/news/${secondary.slug}`} className="group block">
                <div className="border-line bg-surface aspect-[16/10] w-full overflow-hidden rounded-[10px] border">
                  <CoverArt
                    section={secondary.section}
                    seed={secondary.slug}
                    imageUrl={secondary.imageUrl}
                    label={false}
                    className="h-full w-full transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="mt-3">
                  <SectionTag section={secondary.section} />
                  <h2 className="font-editorial text-text-hi group-hover:text-iris mt-2 text-[20px] leading-snug transition-colors">
                    {secondary.title}
                  </h2>
                  {secondary.dek ? (
                    <p className="text-text-mid mt-1.5 text-[13px] leading-relaxed">
                      {secondary.dek}
                    </p>
                  ) : null}
                </div>
              </Link>
              <div className="border-line mt-4 border-t">
                {secondaryRelated.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/news/${c.slug}`}
                    className="group border-line block border-b py-3"
                  >
                    <h3 className="font-editorial text-text-hi group-hover:text-iris text-[15px] leading-snug transition-colors">
                      {c.title}
                    </h3>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {/* Lead (centre, dominant). */}
          <div className="lg:border-line order-1 lg:order-2 lg:col-span-6 lg:border-x lg:px-8">
            <Link href={`/news/${lead.slug}`} className="group block">
              <div className="border-line bg-surface aspect-[16/9] w-full overflow-hidden rounded-[12px] border">
                <CoverArt
                  section={lead.section}
                  seed={lead.slug}
                  imageUrl={lead.imageUrl}
                  className="h-full w-full transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </div>
              <div className="mt-4 flex items-center gap-3 text-[12px]">
                <SectionTag section={lead.section} />
                <span className="ours tnum" title="Importance score">
                  ◆ {lead.importanceScore}
                </span>
                <span className="ours tnum">
                  {lead.sourceCount} {lead.sourceCount === 1 ? "source" : "sources"}
                </span>
                <span className="text-text-low ml-auto">
                  {relativeTime(lead.eventTime)}
                </span>
              </div>
              <h1 className="font-editorial text-text-hi group-hover:text-iris mt-2 text-[30px] leading-[1.1] tracking-[-0.01em] transition-colors sm:text-[38px]">
                {lead.title}
              </h1>
              {lead.dek ? (
                <p className="text-text-mid mt-3 max-w-[60ch] text-[16px] leading-relaxed">
                  {lead.dek}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {lead.tickers.slice(0, 5).map((t) => (
                  <span
                    key={t}
                    className="tnum border-line text-text-mid rounded-[4px] border px-1.5 py-0.5 text-[11px]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </Link>
            {leadRelated ? (
              <Link
                href={`/news/${leadRelated.slug}`}
                className="border-line hover:border-line-strong mt-5 block rounded-[10px] border px-4 py-3"
              >
                <span className="eyebrow">Related</span>
                <p className="font-editorial text-text-hi mt-1 text-[15px] leading-snug">
                  {leadRelated.title}
                </p>
              </Link>
            ) : null}
          </div>

          {/* Latest rail (right). */}
          <div className="order-3 lg:col-span-3">
            <div className="border-line mb-1 flex items-center gap-2 border-b pb-2">
              <span className="rail-title !text-[15px]">Latest</span>
            </div>
            <div className="border-line divide-line divide-y">
              {latest.map((c) => (
                <LatestRow key={c.slug} c={c} />
              ))}
            </div>
            <div className="mt-5">
              <p className="eyebrow mb-2">In focus</p>
              <div className="flex flex-wrap gap-2">
                {allSections().map((s) => (
                  <Link
                    key={s.id}
                    href={`/news?section=${s.id}`}
                    className="border-line text-text-mid hover:border-line-strong hover:text-text-hi inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] transition-colors"
                  >
                    <span
                      aria-hidden
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ background: s.hue }}
                    />
                    {s.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ Section blocks ============ */}
      {blocks.map(({ section, stories }) => {
        const blockLead = stories[0]!;
        const rest = stories.slice(1, 5);
        return (
          <section key={section.id} className="border-line border-b py-8">
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
                <span className="font-editorial text-text-hi group-hover:text-iris text-[22px] tracking-[-0.01em] transition-colors">
                  {section.label}
                </span>
              </Link>
              <Link
                href={`/news?section=${section.id}`}
                className="text-text-low hover:text-iris text-[12px]"
              >
                View all <span aria-hidden>→</span>
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <StoryCard cluster={blockLead} variant="card" />
              </div>
              <div className="list-card divide-line divide-y px-4 lg:col-span-7">
                {rest.map((c) => (
                  <StoryCard key={c.slug} cluster={c} variant="compact" />
                ))}
              </div>
            </div>
          </section>
        );
      })}

      {/* ============ Markets snapshot ============ */}
      <section className="border-line border-b py-8">
        <div className="mb-5 flex items-baseline justify-between">
          <span className="rail-title">Markets snapshot</span>
          <Link href="/markets" className="ours text-[12px]">
            All markets <span aria-hidden>→</span>
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Movers currency={currency} />
          </div>
          <div className="card flex flex-col justify-center p-6 lg:col-span-5">
            <p className="eyebrow">news-to-price</p>
            <p className="font-editorial text-text-hi mt-3 text-[20px] leading-snug">
              Every story is bound to the instruments it concerns — the move sits next
              to the coverage, not in a separate tab.
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
      </section>

      {/* ============ Computed recap ============ */}
      {sessionRecap ? (
        <section className="py-8">
          <Link href={`/recap/${sessionRecap.slug}`} className="block">
            <div className="ours flex items-center gap-2 text-[12px]">
              <span aria-hidden>◆</span>
              <span>Session recap · computed from market data</span>
            </div>
            <p className="font-editorial text-text-hi mt-3 max-w-[72ch] text-[21px] leading-[1.6]">
              {sessionRecap.output.bodyMd}
            </p>
            <span className="ours mt-3 inline-flex items-center gap-1 text-[13px]">
              Read the full recap <span aria-hidden>→</span>
            </span>
          </Link>
        </section>
      ) : null}
    </div>
  );
}
