/**
 * Sparkline — a tiny SVG trend line with a soft area fill. Direction colour
 * (up/down/flat) is decorative here; the number beside it always carries the
 * sign + glyph, so the colour is never the only cue. Pure/deterministic, safe
 * in Server Components.
 */
export function Sparkline({
  values,
  width = 64,
  height = 20,
  dir,
  strokeWidth = 1.25,
  className,
}: {
  values: number[];
  width?: number;
  height?: number;
  dir?: "up" | "down" | "flat";
  strokeWidth?: number;
  className?: string;
}) {
  if (!values || values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 1.5;
  const h = height - pad * 2;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = pad + (h - ((v - min) / span) * h);
    return [x, y] as const;
  });
  const line = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
    .join(" ");
  const area = `${line} L${width} ${height} L0 ${height} Z`;
  const vFirst = values[0] ?? 0;
  const vLast = values.at(-1) ?? vFirst;
  const direction = dir ?? (vLast > vFirst ? "up" : vLast < vFirst ? "down" : "flat");
  const color =
    direction === "up"
      ? "var(--up)"
      : direction === "down"
        ? "var(--down)"
        : "var(--flat)";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden
      preserveAspectRatio="none"
    >
      <path d={area} fill={color} fillOpacity={0.08} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Deterministic illustrative series for a symbol — a seeded random walk that
 * ends on the sign of `changePct`. Used for sparklines in fixture/sample mode;
 * real intraday candles replace it once a live feed is configured.
 */
export function sparkSeries(seed: string, changePct: number, n = 24): number[] {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  const drift = changePct / 100 / n;
  const out: number[] = [];
  let v = 1;
  for (let i = 0; i < n; i++) {
    v += drift + (rand() - 0.5) * 0.004;
    out.push(v);
  }
  // Nudge the endpoint to the correct side of the start so direction reads true.
  const first = out[0] ?? 1;
  const last = out.at(-1) ?? first;
  if (changePct > 0 && last <= first) out[out.length - 1] = first + 0.003;
  if (changePct < 0 && last >= first) out[out.length - 1] = first - 0.003;
  return out;
}
