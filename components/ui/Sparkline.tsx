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
