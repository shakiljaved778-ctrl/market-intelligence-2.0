/**
 * Mizaan mark — a geometric capital "M". The two legs and the central valley
 * are drawn in currentColor; the valley vertex carries the ◆ signal glyph, so
 * the mark keeps the brand's "signal as the pivot" idea. Decorative, so
 * aria-hidden; the accessible name lives on the wordmark link.
 */
export function BrandMark({
  size = 24,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      {/* capital M: left leg → valley → right leg */}
      <path
        d="M4.4 20 V5 L12 12.6 L19.6 5 V20"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* ◆ signal pivot at the valley vertex */}
      <rect
        x="9.8"
        y="10.4"
        width="4.4"
        height="4.4"
        rx="0.5"
        transform="rotate(45 12 12.6)"
        fill="var(--signal)"
      />
    </svg>
  );
}
