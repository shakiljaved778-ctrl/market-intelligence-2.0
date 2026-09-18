import { directionGlyph, directionOf, formatPercent } from "@/lib/format/percent";

/**
 * A self-drawing "market pulse" for the hero (option 2 — motion from our own
 * data, not video). Pure server-rendered SVG + a CSS stroke-draw animation, so
 * it costs nothing against the Lighthouse budget and needs no client bundle. The
 * line traces a REAL recent close series for the session's biggest mover; colour
 * is price direction only (gain/loss), always paired with ▲/▼ and a signed
 * figure (§12). The draw animation is disabled under prefers-reduced-motion.
 */
export function HeroPulse({
  symbol,
  name,
  changePct,
  values,
}: {
  symbol: string;
  name: string;
  changePct: number;
  values: number[];
}) {
  if (values.length < 2) return null;

  const W = 1200;
  const H = 132;
  const pad = 8;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - pad - ((v - min) / span) * (H - pad * 2);
    return [x, y] as const;
  });
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `0,${H} ${line} ${W},${H}`;
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    len += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  const last = pts[pts.length - 1]!;
  const dir = directionOf(changePct);
  const stroke = dir === "loss" ? "var(--loss)" : "var(--gain)";
  const dirClass = dir === "loss" ? "dir-loss" : "dir-gain";

  return (
    <div className="hero-pulse border-line mt-8 border-t pt-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="eyebrow inline-flex items-center gap-2">
          <span className="live-dot" aria-hidden />
          Today&rsquo;s biggest move · computed
        </p>
        <p className="flex items-baseline gap-2 text-[13px]">
          <span className="tnum text-text-hi">{symbol}</span>
          <span className="text-text-low hidden truncate sm:inline">{name}</span>
          <span className={`tnum inline-flex items-center gap-1 ${dirClass}`}>
            <span aria-hidden>{directionGlyph(changePct)}</span>
            {formatPercent(changePct)}
          </span>
        </p>
      </div>
      <svg
        className="mt-3 w-full"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        height={92}
        aria-hidden
      >
        <defs>
          <linearGradient id="pulseArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.16" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#pulseArea)" />
        <polyline
          className="draw-line"
          style={{ "--len": len.toFixed(0) } as React.CSSProperties}
          points={line}
          fill="none"
          stroke={stroke}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <circle cx={last[0]} cy={last[1]} r={3.5} fill={stroke} />
      </svg>
    </div>
  );
}
