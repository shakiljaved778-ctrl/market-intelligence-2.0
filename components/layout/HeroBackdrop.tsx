/**
 * Cinematic hero backdrop — an atmospheric market-data visual (grid + layered
 * area/line silhouettes + glow), not stock photography, so it fits a data
 * product. Pure SVG/markup; sits behind the hero with a scrim over it.
 */
export function HeroBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Base gradient wash. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 78% 0%, color-mix(in srgb, var(--iris) 26%, transparent), transparent 55%), radial-gradient(80% 80% at 12% 20%, color-mix(in srgb, var(--gain) 12%, transparent), transparent 60%), var(--canvas)",
        }}
      />
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1440 720"
        preserveAspectRatio="xMidYMax slice"
      >
        <defs>
          <linearGradient id="areaIris" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--iris)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--iris)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="areaGain" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--gain)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--gain)" stopOpacity="0" />
          </linearGradient>
          <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path
              d="M48 0H0V48"
              fill="none"
              stroke="var(--line)"
              strokeWidth="1"
              opacity="0.5"
            />
          </pattern>
        </defs>

        {/* Faint grid. */}
        <rect width="1440" height="720" fill="url(#grid)" opacity="0.35" />

        {/* Layered chart silhouettes rising toward the right. */}
        <path
          d="M0 560 L120 540 L240 552 L360 500 L480 516 L600 470 L720 486 L840 430 L960 452 L1080 400 L1200 424 L1320 360 L1440 388 L1440 720 L0 720 Z"
          fill="url(#areaGain)"
        />
        <path
          d="M0 600 L120 588 L240 596 L360 560 L480 574 L600 540 L720 556 L840 510 L960 532 L1080 486 L1200 508 L1320 452 L1440 476 L1440 720 L0 720 Z"
          fill="url(#areaIris)"
        />
        <path
          d="M0 600 L120 588 L240 596 L360 560 L480 574 L600 540 L720 556 L840 510 L960 532 L1080 486 L1200 508 L1320 452 L1440 476"
          fill="none"
          stroke="var(--iris)"
          strokeWidth="2"
          strokeOpacity="0.55"
        />
      </svg>
    </div>
  );
}
