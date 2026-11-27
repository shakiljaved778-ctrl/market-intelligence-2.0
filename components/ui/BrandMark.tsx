import { ACTIVE_MARK, type MarkId } from "@/content/brand";

/**
 * Mizaan mark — a geometric capital "M". The two legs and the central valley
 * are drawn in currentColor; the valley vertex carries the ◆ signal glyph, so
 * the mark keeps the brand's "signal as the pivot" idea. Decorative, so
 * aria-hidden; the accessible name lives on the wordmark link.
 */
export function BrandMark({
  size = 24,
  className,
  variant = ACTIVE_MARK,
}: {
  size?: number;
  className?: string;
  /** Which mark to draw; defaults to the one switched on in content/brand.ts. */
  variant?: MarkId;
}) {
  if (variant === "beam") return <BeamMark size={size} className={className} />;
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

/** Proposal A (content/brand.ts): a level beam with the ◆ pivot, the M beneath. */
function BeamMark({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M2.6 5.2 H21.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M5 20 V9.2 L12 15.4 L19 9.2 V20"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="10.3"
        y="3.5"
        width="3.4"
        height="3.4"
        rx="0.4"
        transform="rotate(45 12 5.2)"
        fill="var(--signal)"
      />
    </svg>
  );
}
