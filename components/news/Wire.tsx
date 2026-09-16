import Link from "next/link";
import type { WireCluster } from "@/lib/news/read";
import { relativeTime } from "@/lib/format/relative-time";
import { CoverArt } from "./CoverArt";
import { SectionTag } from "./SectionTag";

/**
 * The wire (§11, §13). Clusters ordered by importance. OUR computed numbers —
 * the importance score and the source count — carry the iris accent that means
 * "this is ours". The aggregated headline is visually distinct (editorial serif)
 * so a reader is never unsure what they are reading. Each row carries a cover
 * image and a section tag so the editorial mix is legible at a glance.
 */
export function Wire({ clusters }: { clusters: WireCluster[] }) {
  if (clusters.length === 0) {
    return (
      <div className="card text-text-mid px-4 py-12 text-center text-[13px]">
        No stories match this filter yet.
      </div>
    );
  }
  return (
    <ol className="list-card">
      {clusters.map((c, i) => (
        <li key={c.slug} className="border-line border-b last:border-b-0">
          <Link
            href={`/news/${c.slug}`}
            className="row-spine hover:bg-surface flex gap-4 px-4 py-4 pl-5 sm:px-5 sm:pl-6"
          >
            {/* Cover image. */}
            <div className="border-line bg-surface hidden h-[72px] w-[116px] shrink-0 overflow-hidden rounded-[8px] border sm:block">
              <CoverArt
                section={c.section}
                seed={c.slug}
                imageUrl={c.imageUrl}
                label={false}
                className="h-full w-full"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 text-[12px]">
                {/* Rank — quiet chrome ordinal. */}
                <span className="tnum text-text-low w-5 shrink-0 tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {/* Score + source count = ours (accent). */}
                <span
                  className="ours tnum border-iris/25 bg-iris/10 inline-flex items-center gap-1 rounded-full border px-2 py-0.5"
                  title="Importance score"
                >
                  ◆ {c.importanceScore}
                </span>
                <span className="ours tnum">
                  {c.sourceCount} {c.sourceCount === 1 ? "source" : "sources"}
                </span>
                <span className="text-text-low ml-auto">
                  {relativeTime(c.eventTime)}
                </span>
              </div>
              <h3 className="font-editorial text-text-hi mt-2 max-w-[68ch] text-[19px] leading-snug">
                {c.title}
              </h3>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <SectionTag section={c.section} />
                {c.tickers.map((t) => (
                  <span
                    key={t}
                    className="tnum border-line text-text-mid rounded-[4px] border px-1.5 py-0.5 text-[11px]"
                  >
                    {t}
                  </span>
                ))}
                {c.topics.slice(0, 2).map((t) => (
                  <span key={t} className="text-text-low text-[11px]">
                    #{t.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ol>
  );
}
