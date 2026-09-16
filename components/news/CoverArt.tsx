import { sectionMeta } from "@/lib/curation/section";

/**
 * Cover art (§12, §13). Every wire card carries an image. When a story has a real
 * image reference (og:image from the source) we render it; otherwise we draw a
 * DETERMINISTIC, on-brand SVG cover from the section + a seed — so the site is
 * visual even in zero-key fixture mode, offline, with no vendor call on render.
 *
 * Design: the cover is monochrome chrome (surface + hairline grid) with a single
 * MUTED section tint used sparingly for the motif — an editorial section colour,
 * kept away from gain-green / loss-red so it can never read as price direction.
 */

function seedNum(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function Motif({ glyph, hue, n }: { glyph: string; hue: string; n: number }) {
  const r = (i: number) => ((seedNum(`${glyph}${n}${i}`) % 1000) / 1000) as number;

  switch (glyph) {
    case "bars": {
      return (
        <g>
          {Array.from({ length: 7 }).map((_, i) => {
            const h = 24 + Math.round(r(i) * 84);
            return (
              <rect
                key={i}
                x={40 + i * 38}
                y={168 - h}
                width={20}
                height={h}
                rx={3}
                fill={hue}
                opacity={0.22 + (i % 3) * 0.12}
              />
            );
          })}
        </g>
      );
    }
    case "wave": {
      const pts = Array.from({ length: 9 }).map((_, i) => {
        const x = 20 + i * 36;
        const y = 100 + Math.sin(i * 0.9 + r(0) * 6) * (26 + r(i) * 18);
        return `${x},${Math.round(y)}`;
      });
      return (
        <polyline
          points={pts.join(" ")}
          fill="none"
          stroke={hue}
          strokeWidth={3}
          strokeLinecap="round"
          opacity={0.65}
        />
      );
    }
    case "circuit": {
      return (
        <g stroke={hue} strokeWidth={2} opacity={0.6} fill="none">
          {Array.from({ length: 6 }).map((_, i) => {
            const y = 40 + i * 24;
            const bend = 60 + Math.round(r(i) * 180);
            return (
              <g key={i}>
                <path d={`M20 ${y} H${bend} V${y + 16} H300`} />
                <circle cx={bend} cy={y} r={3.5} fill={hue} stroke="none" />
              </g>
            );
          })}
        </g>
      );
    }
    case "pulse": {
      const base = 100;
      const d = `M10 ${base} H120 l14 -60 l16 120 l14 -60 H310`;
      return (
        <path
          d={d}
          fill="none"
          stroke={hue}
          strokeWidth={3}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={0.7}
        />
      );
    }
    case "trophy": {
      return (
        <g fill={hue} opacity={0.55}>
          <path d="M120 46 h80 v22 a40 40 0 0 1 -80 0 z" />
          <rect x={150} y={104} width={20} height={26} />
          <rect x={128} y={128} width={64} height={12} rx={3} />
          <path
            d="M120 52 h-18 a18 18 0 0 0 18 18 M200 52 h18 a18 18 0 0 1 -18 18"
            fill="none"
            stroke={hue}
            strokeWidth={5}
          />
        </g>
      );
    }
    case "play": {
      return (
        <g>
          <circle cx={160} cy={100} r={52} fill={hue} opacity={0.16} />
          <circle
            cx={160}
            cy={100}
            r={52}
            fill="none"
            stroke={hue}
            strokeWidth={2.5}
            opacity={0.5}
          />
          <path d="M146 74 l40 26 l-40 26 z" fill={hue} opacity={0.75} />
        </g>
      );
    }
    case "atom":
    default: {
      return (
        <g fill="none" stroke={hue} strokeWidth={2.5} opacity={0.55}>
          <ellipse cx={160} cy={100} rx={80} ry={30} />
          <ellipse cx={160} cy={100} rx={80} ry={30} transform="rotate(60 160 100)" />
          <ellipse cx={160} cy={100} rx={80} ry={30} transform="rotate(120 160 100)" />
          <circle cx={160} cy={100} r={7} fill={hue} stroke="none" />
        </g>
      );
    }
  }
}

export function CoverArt({
  section,
  seed,
  imageUrl,
  className,
  label = true,
}: {
  section: string;
  seed: string;
  imageUrl?: string | null;
  className?: string;
  label?: boolean;
}) {
  const meta = sectionMeta(section);
  const n = seedNum(seed);

  if (imageUrl) {
    // A real source image reference. Kept as a link/reference, never body text.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt=""
        loading="lazy"
        className={`h-full w-full object-cover ${className ?? ""}`}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 320 200"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      role="img"
      aria-label={`${meta.label} cover`}
    >
      <defs>
        <linearGradient id={`cv-${section}-${n}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--raised-2)" />
          <stop offset="100%" stopColor="var(--surface)" />
        </linearGradient>
        <pattern
          id={`dot-${section}-${n}`}
          width="16"
          height="16"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="1.2" cy="1.2" r="1.2" fill="var(--line)" />
        </pattern>
      </defs>
      <rect width="320" height="200" fill={`url(#cv-${section}-${n})`} />
      <rect width="320" height="200" fill={`url(#dot-${section}-${n})`} opacity={0.5} />
      <rect
        x="0"
        y="0"
        width="6"
        height="200"
        fill={meta.hue}
        opacity={meta.financial ? 0.5 : 0.85}
      />
      <Motif glyph={meta.glyph} hue={meta.hue} n={n} />
      {label ? (
        <text
          x="20"
          y="184"
          fill="var(--text-mid)"
          fontSize="11"
          letterSpacing="1.4"
          style={{ fontFamily: "var(--font-mono)", textTransform: "uppercase" }}
        >
          {meta.label}
        </text>
      ) : null}
    </svg>
  );
}
