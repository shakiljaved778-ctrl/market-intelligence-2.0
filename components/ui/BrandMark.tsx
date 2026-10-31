/**
 * Mizaan mark — a minimal balance beam ("mizaan" = scale / balance) whose
 * pivot is the ◆ signal glyph. Structure is currentColor; the ◆ is --signal.
 * Decorative, so aria-hidden; the accessible name lives on the wordmark link.
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
      {/* ◆ pivot (signal) */}
      <rect
        x="9.5"
        y="1.9"
        width="5"
        height="5"
        rx="0.6"
        transform="rotate(45 12 4.4)"
        fill="var(--signal)"
      />
      {/* beam */}
      <path
        d="M3 9.4 H21"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* hangers */}
      <path d="M5 9.4 V12" stroke="currentColor" strokeWidth="1.3" />
      <path d="M19 9.4 V12" stroke="currentColor" strokeWidth="1.3" />
      {/* pans */}
      <path
        d="M2.6 12 a2.4 1.6 0 0 0 4.8 0"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M16.6 12 a2.4 1.6 0 0 0 4.8 0"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
      {/* post + base */}
      <path d="M12 6.6 V19" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M8.5 20.5 H15.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
