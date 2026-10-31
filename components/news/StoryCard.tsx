import Link from "next/link";
import type { WireCluster } from "@/lib/news/read";
import { relativeTime } from "@/lib/format/relative-time";
import { CoverArt } from "./CoverArt";
import { SectionTag } from "./SectionTag";
import { SignalScore } from "@/components/ui/SignalScore";
import { InstrumentChip } from "@/components/ui/InstrumentChip";

function absolute(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    });
  } catch {
    return iso;
  }
}

/**
 * Story card — one editorial unit in three sizes (lead / standard / compact).
 * Anatomy: section kicker, headline, deck, then a meta row with the ◆ signal
 * score (saffron), source count and relative time (absolute on hover), plus
 * bound instrument chips. Hover shifts the surface + underlines the headline;
 * no card lift (§ data-UI discipline).
 */
export function StoryCard({
  cluster,
  variant = "card",
}: {
  cluster: WireCluster;
  variant?: "lead" | "card" | "compact";
}) {
  const time = (
    <span className="text-ink-3" title={absolute(cluster.eventTime)}>
      {relativeTime(cluster.eventTime)}
    </span>
  );
  const sources = (
    <span className="text-signal-strong tnum" title="Distinct source count">
      {cluster.sourceCount} {cluster.sourceCount === 1 ? "source" : "sources"}
    </span>
  );

  if (variant === "compact") {
    return (
      <Link
        href={`/news/${cluster.slug}`}
        className="group hover:bg-surface-2 -mx-2 flex gap-3.5 rounded-[6px] px-2 py-3.5 transition-colors"
      >
        <div className="border-hairline bg-surface h-16 w-24 shrink-0 overflow-hidden rounded-[6px] border">
          <CoverArt
            section={cluster.section}
            seed={cluster.slug}
            imageUrl={cluster.imageUrl}
            label={false}
            className="h-full w-full"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <SectionTag section={cluster.section} />
            <SignalScore score={cluster.importanceScore} showValue={false} />
          </div>
          <h3 className="font-editorial text-ink mt-1.5 line-clamp-2 text-[15px] leading-snug underline-offset-2 group-hover:underline">
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
      className="card group hover:bg-surface-2 flex flex-col overflow-hidden transition-colors"
    >
      <div className="border-hairline bg-surface aspect-[16/9] w-full shrink-0 overflow-hidden border-b">
        <CoverArt
          section={cluster.section}
          seed={cluster.slug}
          imageUrl={cluster.imageUrl}
          label={!cluster.imageUrl}
          className="h-full w-full transition duration-500 group-hover:scale-[1.02]"
        />
      </div>
      <div className={`flex flex-1 flex-col ${isLead ? "p-6" : "p-5"}`}>
        <div className="mb-3 flex items-center gap-2 text-[12px]">
          <SectionTag section={cluster.section} />
          <span className="ml-auto">{sources}</span>
          <span aria-hidden className="text-ink-4">
            ·
          </span>
          {time}
        </div>
        <h3
          className={`font-editorial text-ink underline-offset-2 group-hover:underline ${
            isLead
              ? "t-h2 leading-[1.15]"
              : "line-clamp-3 text-[18px] leading-snug font-semibold"
          }`}
        >
          {cluster.title}
        </h3>
        {cluster.dek ? (
          <p
            className={`text-ink-2 mt-2 text-[14px] leading-relaxed ${
              isLead ? "" : "line-clamp-2"
            }`}
          >
            {cluster.dek}
          </p>
        ) : null}
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
          <SignalScore score={cluster.importanceScore} />
          {cluster.tickers.slice(0, isLead ? 5 : 3).map((t) => (
            <InstrumentChip key={t} symbol={t} asLink={false} />
          ))}
        </div>
      </div>
    </Link>
  );
}
