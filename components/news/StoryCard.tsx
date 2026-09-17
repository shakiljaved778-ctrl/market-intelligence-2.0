import Link from "next/link";
import type { WireCluster } from "@/lib/news/read";
import { relativeTime } from "@/lib/format/relative-time";
import { CoverArt } from "./CoverArt";
import { SectionTag } from "./SectionTag";

/**
 * Story card (§12, §13). One consistent editorial unit used across the board,
 * the section rails and the wire. Cover + section tag + serif headline + our
 * computed source count. Three sizes share the same anatomy.
 */
export function StoryCard({
  cluster,
  variant = "card",
}: {
  cluster: WireCluster;
  variant?: "lead" | "card" | "compact";
}) {
  const meta = (
    <div className="flex items-center gap-2 text-[12px]">
      <SectionTag section={cluster.section} />
      <span
        className="ours tnum ml-auto inline-flex items-center gap-1"
        title="Source count"
      >
        {cluster.sourceCount} {cluster.sourceCount === 1 ? "source" : "sources"}
      </span>
      <span className="text-text-low">· {relativeTime(cluster.eventTime)}</span>
    </div>
  );

  if (variant === "compact") {
    return (
      <Link href={`/news/${cluster.slug}`} className="group flex gap-3.5 py-3.5">
        <div className="border-line bg-surface h-16 w-24 shrink-0 overflow-hidden rounded-[10px] border">
          <CoverArt
            section={cluster.section}
            seed={cluster.slug}
            imageUrl={cluster.imageUrl}
            label={false}
            className="h-full w-full"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px]">
            <SectionTag section={cluster.section} />
            <span className="ours tnum text-[11px]">◆ {cluster.importanceScore}</span>
          </div>
          <h3 className="font-editorial text-text-hi group-hover:text-iris mt-1.5 line-clamp-2 text-[15px] leading-snug transition-colors">
            {cluster.title}
          </h3>
        </div>
      </Link>
    );
  }

  const isLead = variant === "lead";
  return (
    <Link
      href={`/news/${cluster.slug}`}
      className="card card-hover group flex flex-col overflow-hidden"
    >
      <div
        className={`border-line bg-surface w-full shrink-0 overflow-hidden border-b ${
          isLead ? "aspect-[16/9]" : "aspect-[16/9]"
        }`}
      >
        <CoverArt
          section={cluster.section}
          seed={cluster.slug}
          imageUrl={cluster.imageUrl}
          label={!cluster.imageUrl}
          className="h-full w-full transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </div>
      <div className={`flex flex-1 flex-col ${isLead ? "p-6" : "p-5"}`}>
        {meta}
        <h3
          className={`font-editorial text-text-hi group-hover:text-iris mt-3 transition-colors ${
            isLead
              ? "text-[26px] leading-[1.15]"
              : "line-clamp-3 text-[18px] leading-snug"
          }`}
        >
          {cluster.title}
        </h3>
        {isLead ? (
          <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
            {cluster.tickers.slice(0, 4).map((t) => (
              <span
                key={t}
                className="tnum border-line text-text-mid rounded-[4px] border px-1.5 py-0.5 text-[11px]"
              >
                {t}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
