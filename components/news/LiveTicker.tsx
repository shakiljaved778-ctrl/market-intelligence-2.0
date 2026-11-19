import Link from "next/link";
import { relativeTime } from "@/lib/format/relative-time";
import type { LiveItem } from "@/lib/news/live";

/**
 * Live news ticker (owner request, 2026-11-19): the editor-flagged live story
 * first, then the newest headlines, scrolling as a CSS marquee (the market
 * tape's `.ticker-tape` styles: pauses on hover/focus, static and scrollable
 * under prefers-reduced-motion). Every item links to its story page, where
 * the sources are cited. The second copy of the track is aria-hidden.
 */
function Item({
  item,
  now,
  tabbable,
}: {
  item: LiveItem;
  now: Date;
  tabbable: boolean;
}) {
  const c = item.cluster;
  const sources = c.sourceIds.length;
  return (
    <Link
      href={`/news/${c.slug}`}
      tabIndex={tabbable ? undefined : -1}
      className="border-hairline hover:text-brand flex shrink-0 items-center gap-2 border-r px-4 py-2 text-[13px]"
    >
      {item.flagged ? (
        <span className="text-brand text-[11px] font-medium tracking-wide uppercase">
          Developing
        </span>
      ) : null}
      <span className="font-editorial text-ink">{c.title}</span>
      <span className="text-ink-4 text-[11px] whitespace-nowrap">
        {sources} {sources === 1 ? "source" : "sources"} ·{" "}
        <span data-volatile>{relativeTime(c.eventTime, now)}</span>
      </span>
    </Link>
  );
}

export function LiveTicker({ items, now }: { items: LiveItem[]; now: Date }) {
  if (items.length === 0) return null;
  return (
    <div
      className="border-hairline bg-surface mb-6 flex items-stretch overflow-hidden rounded-[8px] border"
      role="region"
      aria-label="Live news: latest headlines"
    >
      <span className="border-hairline text-ink inline-flex shrink-0 items-center gap-2 border-r px-3 text-[11px] font-medium tracking-wide uppercase">
        <span className="live-dot inline-block" aria-hidden />
        Live
      </span>
      <div className="ticker-tape min-w-0 flex-1">
        <div className="ticker-track">
          <span className="flex">
            {items.map((item) => (
              <Item key={item.cluster.slug} item={item} now={now} tabbable />
            ))}
          </span>
          <span className="flex" aria-hidden data-ticker-dup>
            {items.map((item) => (
              <Item
                key={`dup-${item.cluster.slug}`}
                item={item}
                now={now}
                tabbable={false}
              />
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}
