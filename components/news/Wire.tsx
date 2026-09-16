import Link from "next/link";
import type { SluggedCluster } from "@/lib/curation/pipeline";
import { relativeTime } from "@/lib/format/relative-time";

/**
 * The wire (§11, §13). Clusters ordered by importance. OUR computed numbers —
 * the importance score and the source count — carry the iris accent that means
 * "this is ours". The aggregated headline is visually distinct (editorial serif)
 * so a reader is never unsure what they are reading.
 */
export function Wire({ clusters }: { clusters: SluggedCluster[] }) {
  if (clusters.length === 0) {
    return (
      <p className="text-text-mid border-line border px-4 py-10 text-center text-[13px]">
        No stories match this filter yet.
      </p>
    );
  }
  return (
    <ol className="border-line border-t">
      {clusters.map((c) => (
        <li key={c.slug} className="border-line border-b">
          <Link
            href={`/news/${c.slug}`}
            className="hover:bg-surface block px-4 py-4 transition-colors"
          >
            <div className="flex items-center gap-3 text-[12px]">
              {/* Score + source count = ours (accent). */}
              <span className="ours tnum" title="Importance score">
                ◆ {c.importanceScore}
              </span>
              <span className="ours tnum">
                {c.sourceCount} {c.sourceCount === 1 ? "source" : "sources"}
              </span>
              <span className="text-text-low">{relativeTime(c.eventTime)}</span>
            </div>
            <h3 className="font-editorial text-text-hi mt-1.5 max-w-[68ch] text-[19px] leading-snug">
              {c.title}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
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
          </Link>
        </li>
      ))}
    </ol>
  );
}
