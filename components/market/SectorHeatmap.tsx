"use client";

import { Treemap, ResponsiveContainer } from "recharts";

export type HeatTile = { name: string; size: number; changePct: number };
export type HeatGroup = { name: string; children: HeatTile[] };

/** Diverging fill: up (green) for gains, down (red) for losses, intensity by
 *  magnitude, over a neutral surface. Paired with a ▲/▼ glyph + sign in the
 *  tile text so colour is never the only cue (§12). */
function fillFor(pct: number): string {
  const pos = pct >= 0;
  const inten = Math.min(62, Math.abs(pct) * 16);
  return `color-mix(in srgb, var(--${pos ? "up" : "down"}) ${inten}%, var(--surface-2))`;
}

type CellProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  depth?: number;
  name?: string;
  changePct?: number;
};

function Cell(props: CellProps) {
  const {
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    depth = 0,
    name = "",
    changePct,
  } = props;

  if (depth === 1) {
    // Sector container — hairline border + label.
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill="transparent"
          stroke="var(--hairline)"
          strokeWidth={1}
        />
        {width > 60 && height > 16 ? (
          <text
            x={x + 6}
            y={y + 13}
            fontSize={10}
            fill="var(--ink-3)"
            style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}
          >
            {name}
          </text>
        ) : null}
      </g>
    );
  }

  const pct = typeof changePct === "number" ? changePct : 0;
  const pos = pct >= 0;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fillFor(pct)}
        stroke="var(--bg)"
        strokeWidth={1}
      />
      {width > 46 && height > 30 ? (
        <>
          <text
            x={x + 5}
            y={y + 17}
            fontSize={11}
            fontFamily="var(--font-mono)"
            fill="var(--ink)"
          >
            {name}
          </text>
          <text
            x={x + 5}
            y={y + 31}
            fontSize={10}
            fontFamily="var(--font-mono)"
            fill={pos ? "var(--up)" : "var(--down)"}
          >
            {pos ? "▲" : "▼"}
            {Math.abs(pct).toFixed(2)}%
          </text>
        </>
      ) : null}
    </g>
  );
}

export function SectorHeatmap({ data }: { data: HeatGroup[] }) {
  return (
    <div>
      <div className="border-hairline bg-surface h-[340px] w-full overflow-hidden rounded-[8px] border p-1">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={data}
            dataKey="size"
            stroke="var(--bg)"
            isAnimationActive={false}
            content={<Cell />}
          />
        </ResponsiveContainer>
      </div>
      <div className="text-ink-3 mt-2 flex items-center gap-3 text-[11px]">
        <span>Sized by market cap · coloured by session change</span>
        <span className="ml-auto flex items-center gap-1">
          <span
            aria-hidden
            className="inline-block h-2.5 w-4 rounded-[2px]"
            style={{ background: fillFor(-3) }}
          />
          ▼ loss
          <span
            aria-hidden
            className="ml-2 inline-block h-2.5 w-4 rounded-[2px]"
            style={{ background: fillFor(3) }}
          />
          ▲ gain
        </span>
      </div>
    </div>
  );
}
