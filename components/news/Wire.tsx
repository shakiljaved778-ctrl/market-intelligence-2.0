import Link from "next/link";
import { Fragment } from "react";
import { InlineVideo } from "@/components/video/InlineVideo";
import type { OfficialPlaylist } from "@/lib/videos/playlists";
import type { WireCluster } from "@/lib/news/read";
import { relativeTime } from "@/lib/format/relative-time";
import { CoverArt } from "./CoverArt";
import { SectionTag } from "./SectionTag";

/**
 * The wire (§11, §13). Clusters ordered by importance, each in its own spaced
 * card so stories breathe (white space between articles). OUR computed numbers —
 * importance score and source count — carry the iris accent ("this is ours").
 * Headlines are bold sans (owner request, 2026-11-27). Every story carries a cover and a section tag.
 */
/** One official-channel video after every this many stories (owner request, 2026-11-27). */
export const VIDEO_EVERY = 4;

export function Wire({
  clusters,
  videos = [],
}: {
  clusters: WireCluster[];
  /** Playlists to place between stories; none = no videos. */
  videos?: OfficialPlaylist[];
}) {
  if (clusters.length === 0) {
    return (
      <div className="card text-text-mid px-4 py-12 text-center text-[13px]">
        No stories match this filter yet.
      </div>
    );
  }
  return (
    <ol className="flex flex-col gap-4 sm:gap-5">
      {clusters.map((c, i) => (
        <Fragment key={c.slug}>
          <li>
            <Link
              href={`/news/${c.slug}`}
              className="card card-hover group flex items-stretch gap-0 overflow-hidden"
            >
              {/* Cover image. */}
              <div className="border-line bg-surface relative hidden w-[180px] shrink-0 self-stretch overflow-hidden border-r sm:block lg:w-[240px]">
                <CoverArt
                  section={c.section}
                  seed={c.slug}
                  imageUrl={c.imageUrl}
                  label={false}
                  className="absolute inset-0 h-full w-full transition-transform duration-500 group-hover:scale-[1.04]"
                />
              </div>

              <div className="min-w-0 flex-1 p-5 sm:p-6">
                <div className="flex items-center gap-3 text-[12px]">
                  <span className="tnum text-text-low w-5 shrink-0 tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
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
                <h3 className="text-text-hi group-hover:text-iris mt-2.5 max-w-[68ch] font-sans text-[20px] leading-snug font-bold tracking-tight transition-colors">
                  {c.title}
                </h3>
                <div className="mt-3 flex flex-wrap items-center gap-2">
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
          {videos.length > 0 &&
          (i + 1) % VIDEO_EVERY === 0 &&
          i < clusters.length - 1 ? (
            <li aria-label="Video">
              <InlineVideo
                playlist={videos[((i + 1) / VIDEO_EVERY - 1) % videos.length]!}
              />
            </li>
          ) : null}
        </Fragment>
      ))}
    </ol>
  );
}
