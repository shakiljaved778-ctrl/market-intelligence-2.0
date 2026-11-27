/**
 * Static sparkline for the macro tiles on /economy (2026-11-27). The tiles
 * used a full Recharts chart each; about thirty of them hydrating on the client
 * gave /economy a mobile Lighthouse score of 73 (Total Blocking Time ~730 ms).
 * This draws the same neutral area + line as plain SVG on the server — no
 * client JavaScript. The full, interactive chart stays on the detail pages.
 */
export interface SparkPoint {
  date: string;
  value: number;
}

/** PURE: the line and area paths for points scaled into a width × height box. */
export function sparkPaths(
  data: SparkPoint[],
  width: number,
  height: number,
  pad = 4,
): { line: string; area: string } | null {
  const pts = data.filter((d) => Number.isFinite(d.value));
  if (pts.length < 2) return null;
  const values = pts.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => (i / (pts.length - 1)) * width;
  const y = (v: number) => pad + (1 - (v - min) / span) * (height - pad * 2);
  const coords = pts.map((d, i) => `${x(i).toFixed(1)},${y(d.value).toFixed(1)}`);
  const line = `M${coords.join(" L")}`;
  const area = `${line} L${width},${height} L0,${height} Z`;
  return { line, area };
}

export function MacroSpark({
  data,
  label,
  height = 120,
}: {
  data: SparkPoint[];
  /** Accessible description, e.g. "Inflation, last 24 observations". */
  label: string;
  height?: number;
}) {
  const width = 300;
  const paths = sparkPaths(data, width, height);
  if (!paths) return <div style={{ height }} aria-hidden />;
  const id = `spark-${label.replace(/[^a-z0-9]/gi, "").slice(0, 24)}-${data.length}`;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="block w-full"
      style={{ height, color: "var(--text-mid)" }}
      role="img"
      aria-label={label}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity={0.22} />
          <stop offset="100%" stopColor="currentColor" stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={paths.area} fill={`url(#${id})`} />
      <path
        d={paths.line}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
    </svg>
  );
}
