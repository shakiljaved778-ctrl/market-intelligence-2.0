import Link from "next/link";
import { CoverArt } from "@/components/news/CoverArt";
import { relativeTime } from "@/lib/format/relative-time";
import type { StoredOriginal } from "@/lib/db/queries/originals";

/**
 * The Mizaan Original card — the homepage's lead piece (owner request,
 * 2026-11-20), in the same anatomy as a story card. It is OUR content, so it
 * carries the ◆ "ours" accent (§12) and says plainly that it is AI-written
 * from cited reports.
 */
export function OriginalCard({
  original,
  priority = false,
}: {
  original: StoredOriginal;
  /** Set on the homepage's first card, the page's largest image. */
  priority?: boolean;
}) {
  return (
    <Link
      href={`/analysis/${original.slug}`}
      className="card group hover:bg-surface-2 flex flex-col overflow-hidden transition-colors"
    >
      <div className="border-hairline bg-surface aspect-[16/9] w-full shrink-0 overflow-hidden border-b">
        <CoverArt
          section="markets"
          seed={original.slug}
          imageUrl={original.coverUrl}
          label={false}
          feature={{ place: "Global markets" }}
          priority={priority}
          className="h-full w-full transition duration-500 group-hover:scale-[1.02]"
        />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex items-center gap-2 text-[12px]">
          <span className="ours border-iris/25 bg-iris/10 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px]">
            <span aria-hidden>◆</span> Mizaan Original
          </span>
          <span className="text-signal-strong tnum ml-auto">
            {original.sources.length} cited reports
          </span>
          <span aria-hidden className="text-ink-4">
            ·
          </span>
          <span className="text-ink-3">{relativeTime(original.publishedAt)}</span>
        </div>
        <h3 className="font-editorial text-ink line-clamp-3 text-[18px] leading-snug font-semibold underline-offset-2 group-hover:underline">
          {original.title}
        </h3>
        <p className="text-ink-2 mt-2 line-clamp-2 text-[14px] leading-relaxed">
          {original.dek}
        </p>
        <p className="text-ink-3 mt-auto pt-4 text-[11px]">
          Global markets overview · AI-written from cited reports
        </p>
      </div>
    </Link>
  );
}
