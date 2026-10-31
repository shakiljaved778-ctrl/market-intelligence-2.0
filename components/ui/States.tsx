/**
 * Shared state primitives — skeletons, empty, error and stale-data stamps.
 * Never render a blank box.
 */

export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return <div className={`mi-skeleton ${className ?? ""}`} style={style} aria-hidden />;
}

/** A card-shaped skeleton: cover block + two text lines. */
export function CardSkeleton() {
  return (
    <div className="border-hairline bg-surface rounded-[8px] border p-3" aria-hidden>
      <Skeleton className="aspect-[16/9] w-full rounded-[6px]" />
      <Skeleton className="mt-3 h-4 w-3/4" />
      <Skeleton className="mt-2 h-4 w-1/2" />
    </div>
  );
}

export function EmptyState({
  title = "Nothing here yet",
  hint,
}: {
  title?: string;
  hint?: string;
}) {
  return (
    <div
      role="status"
      className="border-hairline text-ink-3 flex flex-col items-center justify-center gap-1 rounded-[8px] border border-dashed px-6 py-10 text-center"
    >
      <span aria-hidden className="text-ink-4 text-[18px]">
        ◆
      </span>
      <p className="text-ink-2 text-[14px] font-medium">{title}</p>
      {hint ? <p className="text-ink-3 text-[13px]">{hint}</p> : null}
    </div>
  );
}

export function ErrorState({
  title = "Couldn’t load this",
  hint = "Try again shortly.",
}: {
  title?: string;
  hint?: string;
}) {
  return (
    <div
      role="alert"
      className="border-hairline bg-down-soft/40 text-ink-2 flex flex-col items-center justify-center gap-1 rounded-[8px] border px-6 py-10 text-center"
    >
      <p className="text-ink text-[14px] font-medium">{title}</p>
      <p className="text-ink-3 text-[13px]">{hint}</p>
    </div>
  );
}

/** "Last updated 14:32 · data delayed" — honest freshness stamp under data. */
export function StaleStamp({
  updated,
  delayed = true,
  source,
}: {
  updated: string;
  delayed?: boolean;
  source?: string;
}) {
  return (
    <p className="text-ink-3 t-micro inline-flex items-center gap-1.5">
      <span>Last updated {updated}</span>
      {delayed ? <span aria-hidden>·</span> : null}
      {delayed ? <span>data delayed</span> : null}
      {source ? (
        <>
          <span aria-hidden>·</span>
          <span>{source}</span>
        </>
      ) : null}
    </p>
  );
}
