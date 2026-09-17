import Link from "next/link";
import { CoverArt } from "@/components/news/CoverArt";
import { PageHeader } from "@/components/layout/PageHeader";
import { readSectionSummaries } from "@/lib/news/read";

export const metadata = {
  title: "Sections",
  description:
    "Markets-first, with a deliberate non-financial mix — technology, health, sport, culture and science — to keep the whole picture in view.",
};

export default async function SectionsPage() {
  const { sections, total, nonFinancial, nonFinancialPct } =
    await readSectionSummaries();

  return (
    <div className="pb-8">
      <div className="header-band bleed">
        <div className="mx-auto max-w-[1280px] px-4 py-8">
          <PageHeader
            kicker="sections · the whole picture"
            title="Sections"
            subtitle={
              <>
                Mizaan is markets-first — but a deliberate share of the wire is{" "}
                non-financial, so the feed reflects the world, not just the tape.{" "}
                <span className="text-text-low">
                  Sections are assigned deterministically, never by a model.
                </span>
              </>
            }
          />

          {/* Computed editorial-mix stat — ours. */}
          <div
            className="fade-up mt-5 inline-flex items-center gap-2 text-[12px]"
            style={{ "--d": "80ms" } as React.CSSProperties}
          >
            <span className="ours tnum border-iris/25 bg-iris/10 inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
              ◆ {nonFinancialPct}% non-financial
            </span>
            <span className="text-text-low">
              {nonFinancial} of {total} live stories are outside markets &amp; economy
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s, i) => (
          <Link
            key={s.section.id}
            href={`/news?section=${s.section.id}`}
            className="card card-hover fade-up flex flex-col overflow-hidden"
            style={{ "--d": `${i * 60}ms` } as React.CSSProperties}
          >
            <div className="border-line bg-surface aspect-[16/7] w-full overflow-hidden border-b">
              <CoverArt
                section={s.section.id}
                seed={s.lead?.slug ?? s.section.id}
                imageUrl={s.lead?.imageUrl ?? null}
                className="h-full w-full"
              />
            </div>
            <div className="flex flex-1 flex-col p-5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2">
                  <span
                    aria-hidden
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: s.section.hue }}
                  />
                  <span className="text-text-hi text-[15px] font-medium">
                    {s.section.label}
                  </span>
                </span>
                <span className="tnum text-text-low text-[12px]">
                  {s.count} {s.count === 1 ? "story" : "stories"}
                </span>
              </div>
              <p className="text-text-mid mt-2 text-[13px] leading-relaxed">
                {s.section.blurb}
              </p>
              {s.lead ? (
                <p className="font-editorial text-text-hi mt-3 line-clamp-2 text-[15px] leading-snug">
                  {s.lead.title}
                </p>
              ) : (
                <p className="text-text-low mt-3 text-[13px]">No stories yet.</p>
              )}
              <span className="ours mt-auto inline-flex items-center gap-1 pt-3 text-[12px]">
                Open section <span aria-hidden>→</span>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
