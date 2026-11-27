import Link from "next/link";

/**
 * Signal score — Mizaan's signature. A ◆ glyph, the numeric rank score and a
 * 5-segment meter, all in --signal (saffron, "this is ours / computed"). The
 * tooltip explains how it's computed; optionally links to /methodology.
 *
 * `score` is the cluster importanceScore (0–100). Segments fill in fifths.
 */
const TOOLTIP =
  "Importance score (0–100), computed deterministically from distinct sources, source tier, the biggest bound-instrument move and whether a primary source is present. Higher = more corroborated, market-moving coverage.";

export function SignalScore({
  score,
  showValue = true,
  asLink = false,
  className,
}: {
  score: number;
  showValue?: boolean;
  asLink?: boolean;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const filled = Math.max(1, Math.min(5, Math.round(clamped / 20)));

  const body = (
    <span
      className={`text-signal-strong inline-flex items-center gap-1.5 ${className ?? ""}`}
      title={asLink ? undefined : `${TOOLTIP}`}
    >
      <span aria-hidden className="text-[11px] leading-none">
        ◆
      </span>
      {showValue ? (
        // Labelled on screen (owner review, 2026-11-27): a bare "◆ 78" read as
        // noise; "Importance 78/100" says what the number is.
        <span className="text-[12px] leading-none">
          Importance <span className="tnum text-[13px] font-medium">{clamped}</span>
          <span className="tnum opacity-70">/100</span>
        </span>
      ) : null}
      <span
        aria-hidden
        className="inline-flex items-center gap-[2px]"
        role="img"
        aria-label={`Signal ${filled} of 5`}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="h-[10px] w-[3px] rounded-[1px]"
            style={{
              background: i < filled ? "var(--signal)" : "var(--hairline-strong)",
            }}
          />
        ))}
      </span>
    </span>
  );

  if (asLink) {
    return (
      <Link
        href="/methodology"
        title={TOOLTIP}
        aria-label={`Importance ${clamped} of 100. How it's computed`}
        className="focus-visible:outline-brand rounded-[2px]"
      >
        {body}
      </Link>
    );
  }
  return body;
}
