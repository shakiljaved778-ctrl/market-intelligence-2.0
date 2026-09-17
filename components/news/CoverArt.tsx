import { sectionMeta } from "@/lib/curation/section";

/**
 * Cover art (§12, §13). Every story carries a cover. A real image reference
 * (og:image / a resolved Pexels photo) renders as a photo under a legibility
 * scrim; otherwise we draw a DETERMINISTIC, on-brand generative cover from the
 * section + seed — a layered gradient mesh, fine grid, film grain and a restrained
 * section motif. It reads as intentional editorial art at any size, offline, with
 * no vendor call on render.
 *
 * Colour discipline (§12): the section tint is muted and used only inside the art
 * (blooms + motif), never on chrome or data, and avoids gain-green / loss-red.
 */

function seedNum(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Abstract, thin-stroke motif — texture, not clip-art. Sits lower-right. */
function Motif({ glyph, hue, n }: { glyph: string; hue: string; n: number }) {
  const r = (i: number) => (seedNum(`${glyph}${n}${i}`) % 1000) / 1000;

  switch (glyph) {
    case "bars": {
      return (
        <g>
          {Array.from({ length: 9 }).map((_, i) => {
            const h = 14 + Math.round(r(i) * 78);
            return (
              <rect
                key={i}
                x={196 + i * 22}
                y={168 - h}
                width={9}
                height={h}
                rx={2}
                fill={hue}
                opacity={0.18 + (i % 3) * 0.1}
              />
            );
          })}
        </g>
      );
    }
    case "wave": {
      const line = (amp: number, yb: number, op: number) => {
        const pts = Array.from({ length: 13 }).map((_, i) => {
          const x = 8 + i * 32;
          const y = yb + Math.sin(i * 0.7 + r(0) * 6) * amp;
          return `${x},${Math.round(y)}`;
        });
        return (
          <polyline
            points={pts.join(" ")}
            fill="none"
            stroke={hue}
            strokeWidth={2}
            strokeLinecap="round"
            opacity={op}
          />
        );
      };
      return (
        <g>
          {line(22, 96, 0.5)}
          {line(30, 120, 0.32)}
        </g>
      );
    }
    case "circuit": {
      return (
        <g stroke={hue} strokeWidth={1.4} opacity={0.5} fill="none">
          {Array.from({ length: 7 }).map((_, i) => {
            const y = 26 + i * 22;
            const bend = 120 + Math.round(r(i) * 210);
            return (
              <g key={i}>
                <path d={`M150 ${y} H${bend} V${y + 14} H392`} />
                <circle cx={bend} cy={y} r={2.6} fill={hue} stroke="none" />
              </g>
            );
          })}
        </g>
      );
    }
    case "pulse": {
      return (
        <path
          d="M0 120 H150 l16 -66 l18 120 l14 -80 l10 26 H400"
          fill="none"
          stroke={hue}
          strokeWidth={2.4}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={0.6}
        />
      );
    }
    case "trophy": {
      // Abstract concentric arcs — a podium/ring feel, not clip-art.
      return (
        <g fill="none" stroke={hue} strokeLinecap="round">
          {Array.from({ length: 5 }).map((_, i) => (
            <circle
              key={i}
              cx={300}
              cy={150}
              r={40 + i * 26}
              strokeWidth={2}
              opacity={0.36 - i * 0.05}
              strokeDasharray={`${120 + i * 40} 900`}
              transform={`rotate(${-40 + i * 8} 300 150)`}
            />
          ))}
        </g>
      );
    }
    case "play": {
      return (
        <g>
          {[70, 46, 24].map((rad, i) => (
            <circle
              key={rad}
              cx={300}
              cy={112}
              r={rad}
              fill="none"
              stroke={hue}
              strokeWidth={1.6}
              opacity={0.4 - i * 0.08}
            />
          ))}
          <path d="M288 92 l34 20 l-34 20 z" fill={hue} opacity={0.7} />
        </g>
      );
    }
    case "atom":
    default: {
      return (
        <g fill="none" stroke={hue} strokeWidth={1.8} opacity={0.42}>
          <ellipse cx={300} cy={112} rx={92} ry={34} />
          <ellipse cx={300} cy={112} rx={92} ry={34} transform="rotate(60 300 112)" />
          <ellipse cx={300} cy={112} rx={92} ry={34} transform="rotate(120 300 112)" />
          <circle cx={300} cy={112} r={5} fill={hue} stroke="none" />
        </g>
      );
    }
  }
}

/**
 * A keyless, deterministic real photo for a story that has no resolved image.
 * Browser-loaded from a CDN (a static asset, not a data API), so it needs no key
 * and never calls a vendor on the server (§17). Topical Pexels photos, when the
 * backfill script has run, take precedence via `imageUrl`. If this ever fails to
 * load, the generative art layer beneath shows through — nothing renders empty.
 */
function fallbackPhoto(seed: string): string {
  return `https://picsum.photos/seed/mizan-${encodeURIComponent(seed)}/960/600`;
}

/** The on-brand generative art — used as the base layer under every photo. */
function GenerativeArt({
  meta,
  n,
  uid,
  className,
}: {
  meta: ReturnType<typeof sectionMeta>;
  n: number;
  uid: string;
  className?: string;
}) {
  const angle = (n % 90) - 45;
  return (
    <svg
      viewBox="0 0 400 250"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={`base-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--raised-2)" />
          <stop offset="100%" stopColor="var(--surface)" />
        </linearGradient>
        <radialGradient id={`bloomA-${uid}`} cx="78%" cy="18%" r="60%">
          <stop
            offset="0%"
            stopColor={meta.hue}
            stopOpacity={meta.financial ? 0.22 : 0.34}
          />
          <stop offset="100%" stopColor={meta.hue} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`bloomB-${uid}`} cx="12%" cy="96%" r="66%">
          <stop
            offset="0%"
            stopColor={meta.hue}
            stopOpacity={meta.financial ? 0.12 : 0.18}
          />
          <stop offset="100%" stopColor={meta.hue} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`vig-${uid}`} cx="50%" cy="42%" r="75%">
          <stop offset="60%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.32" />
        </radialGradient>
        <pattern
          id={`grid-${uid}`}
          width="26"
          height="26"
          patternUnits="userSpaceOnUse"
          patternTransform={`rotate(${angle} 200 125)`}
        >
          <path d="M26 0 H0 V26" fill="none" stroke="var(--line)" strokeWidth="1" />
        </pattern>
        <filter id={`grain-${uid}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>

      <rect width="400" height="250" fill={`url(#base-${uid})`} />
      <rect width="400" height="250" fill={`url(#grid-${uid})`} opacity="0.35" />
      <rect width="400" height="250" fill={`url(#bloomA-${uid})`} />
      <rect width="400" height="250" fill={`url(#bloomB-${uid})`} />
      <Motif glyph={meta.glyph} hue={meta.hue} n={n} />
      <rect width="400" height="250" fill={`url(#vig-${uid})`} />
      <rect width="400" height="250" filter={`url(#grain-${uid})`} opacity="0.05" />
    </svg>
  );
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
  const uid = `${section}-${n}`;
  const photo = imageUrl ?? fallbackPhoto(seed);

  return (
    <div className={`relative overflow-hidden ${className ?? ""}`}>
      {/* Base layer: on-brand generative art (shows if the photo fails). */}
      <GenerativeArt
        meta={meta}
        n={n}
        uid={uid}
        className="absolute inset-0 h-full w-full"
      />
      {/* Real photo on top; object-cover fills the frame. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo}
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Legibility scrim + a subtle top vignette to seat text. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--canvas) 22%, transparent) 0%, transparent 38%, color-mix(in srgb, var(--canvas) 82%, transparent) 100%)",
        }}
      />
      {label ? (
        <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/35 px-2 py-0.5 text-[10px] tracking-[0.12em] text-white/90 uppercase backdrop-blur-sm">
          <span
            aria-hidden
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: meta.hue }}
          />
          {meta.label}
        </span>
      ) : null}
    </div>
  );
}
