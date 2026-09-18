/**
 * Inline SVG sparkline (§12, §13). A pure, server-rendered mini line — no client
 * bundle, no vendor call. Drawn from a real close series; the stroke uses the
 * price-direction colour (gain/loss), which is always paired with the signed
 * change in the same row, so colour is never the sole encoding (§12). The slope
 * itself also carries direction.
 */
export function Sparkline({
  values,
  up,
  width = 76,
  height = 22,
  className,
}: {
  values: number[];
  up: boolean;
  width?: number;
  height?: number;
  className?: string;
}) {
  if (values.length < 2) {
    return <span className="text-text-low text-[11px]">—</span>;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = width / (values.length - 1);
  const pad = 1.5;
  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - pad - ((v - min) / span) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const stroke = up ? "var(--gain)" : "var(--loss)";
  const last = points[points.length - 1]?.split(",") ?? ["0", "0"];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="none"
      aria-hidden
    >
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r={1.6} fill={stroke} />
    </svg>
  );
}
