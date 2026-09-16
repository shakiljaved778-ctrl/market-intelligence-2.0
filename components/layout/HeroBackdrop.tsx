/**
 * Cinematic hero backdrop (ref: Alula). Three decorative layers, all vector so
 * they cost nothing against the Lighthouse budget and read crisply in both
 * themes: an aurora field, a wired circuit of hexagon nodes, and a market-data
 * silhouette. The violet/cyan hues are chrome only — data still uses gain/loss
 * + iris (§12). Everything here is aria-hidden and non-interactive.
 */

/** A labelled hexagon node that floats in the hero's side margins. */
function Node({
  className,
  label,
  glyph,
}: {
  className: string;
  label: string;
  glyph: React.ReactNode;
}) {
  return (
    <div className={`hero-node hidden lg:inline-flex ${className}`}>
      <span className="hero-node-mark">{glyph}</span>
      <span>{label}</span>
    </div>
  );
}

export function HeroBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* 1 — aurora field. */}
      <div className="aurora" />

      {/* 2 — wired circuit + market silhouette. */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1440 720"
        preserveAspectRatio="xMidYMax slice"
      >
        <defs>
          <linearGradient id="areaIris" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--iris)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--iris)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="areaCyan" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--aurora-3)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--aurora-3)" stopOpacity="0" />
          </linearGradient>
          <pattern id="grid" width="46" height="46" patternUnits="userSpaceOnUse">
            <path
              d="M46 0H0V46"
              fill="none"
              stroke="var(--line)"
              strokeWidth="1"
              opacity="0.5"
            />
          </pattern>
        </defs>

        {/* Faint grid. */}
        <rect width="1440" height="720" fill="url(#grid)" opacity="0.3" />

        {/* Circuit traces wiring the node positions to the edges. */}
        <g fill="none" stroke="var(--node-line)" strokeWidth="1.4" strokeOpacity="0.55">
          <path d="M-20 158 H150 L210 218 H300" />
          <path d="M-20 324 H120 L176 380 H300" />
          <path d="M-20 560 H190 L250 500 H330" />
          <path d="M1460 196 H1230 L1170 256 H1090" />
          <path d="M1460 470 H1250 L1190 410 H1110" />
        </g>
        {/* Node solder points. */}
        <g fill="var(--iris-strong)">
          {[
            [300, 218],
            [300, 380],
            [330, 500],
            [1090, 256],
            [1110, 410],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="3" />
          ))}
        </g>

        {/* Market-data silhouettes rising toward the right. */}
        <path
          d="M0 566 L120 546 L240 558 L360 506 L480 522 L600 476 L720 492 L840 436 L960 458 L1080 406 L1200 430 L1320 366 L1440 394 L1440 720 L0 720 Z"
          fill="url(#areaIris)"
        />
        <path
          d="M0 606 L120 594 L240 602 L360 566 L480 580 L600 546 L720 562 L840 516 L960 538 L1080 492 L1200 514 L1320 458 L1440 482 L1440 720 L0 720 Z"
          fill="url(#areaCyan)"
        />
        <path
          d="M0 566 L120 546 L240 558 L360 506 L480 522 L600 476 L720 492 L840 436 L960 458 L1080 406 L1200 430 L1320 366 L1440 394"
          fill="none"
          stroke="var(--iris)"
          strokeWidth="2"
          strokeOpacity="0.5"
        />
      </svg>

      {/* 3 — floating labelled nodes in the side margins. */}
      <Node
        className="top-[22%] left-[3.5%]"
        label="Live markets"
        glyph={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M4 15l4-4 3 3 5-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        }
      />
      <Node
        className="top-[42%] left-[2%]"
        label="Source-ranked wire"
        glyph={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M5 6h14M5 12h14M5 18h9"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        }
      />
      <Node
        className="bottom-[24%] left-[5%]"
        label="Computed recaps"
        glyph={<span className="text-[13px] leading-none">◆</span>}
      />
      <Node
        className="top-[25%] right-[4%]"
        label="GCC + Global"
        glyph={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
            <path
              d="M4 12h16M12 4c2.5 2.4 2.5 13.2 0 16M12 4c-2.5 2.4-2.5 13.2 0 16"
              stroke="currentColor"
              strokeWidth="1.4"
            />
          </svg>
        }
      />
      <Node
        className="right-[6%] bottom-[30%]"
        label="USD · QAR"
        glyph={<span className="tnum text-[11px] leading-none">$</span>}
      />
    </div>
  );
}
