"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useId } from "react";

/**
 * Macro area chart (§4 Recharts). Monochrome chrome (§12): macro is source data,
 * not our computed content, so the mark stays neutral (text-mid) — colour is
 * reserved for price direction. A soft area fill gives it weight; a faint
 * horizontal grid + hover crosshair make values readable. Currency-neutral
 * (levels / percent are never converted, §7).
 *
 * `variant`:
 *   - "mini"  → sparkline for cards: no axes, no grid, shorter.
 *   - "full"  → detail view: axes + grid.
 */
export function MacroChart({
  data,
  color = "var(--text-mid)",
  variant = "full",
  height,
  unit,
}: {
  data: { date: string; value: number }[];
  color?: string;
  variant?: "mini" | "full";
  height?: number;
  unit?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const mini = variant === "mini";
  const h = height ?? (mini ? 120 : 240);

  return (
    <ResponsiveContainer width="100%" height={h}>
      <AreaChart
        data={data}
        margin={
          mini
            ? { top: 6, right: 4, bottom: 0, left: 4 }
            : { top: 8, right: 8, bottom: 0, left: -12 }
        }
      >
        <defs>
          <linearGradient id={`macro-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.22} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {!mini ? (
          <CartesianGrid
            vertical={false}
            stroke="var(--line)"
            strokeOpacity={0.6}
            strokeDasharray="2 4"
          />
        ) : null}
        {!mini ? (
          <XAxis
            dataKey="date"
            tick={{
              fontSize: 10,
              fill: "var(--text-low)",
              fontFamily: "var(--font-mono)",
            }}
            tickFormatter={(d: string) => (d.length >= 7 ? d.slice(0, 7) : d)}
            axisLine={{ stroke: "var(--line)" }}
            tickLine={false}
            minTickGap={28}
          />
        ) : (
          <XAxis dataKey="date" hide />
        )}
        {!mini ? (
          <YAxis
            width={40}
            tick={{
              fontSize: 10,
              fill: "var(--text-low)",
              fontFamily: "var(--font-mono)",
            }}
            axisLine={false}
            tickLine={false}
            domain={["auto", "auto"]}
          />
        ) : (
          <YAxis hide domain={["auto", "auto"]} />
        )}
        <Tooltip
          cursor={{ stroke: "var(--line)", strokeWidth: 1 }}
          contentStyle={{
            background: "var(--raised)",
            border: "1px solid var(--line)",
            borderRadius: 8,
            fontSize: 12,
            boxShadow: "none",
          }}
          labelStyle={{ color: "var(--text-mid)" }}
          itemStyle={{ color: "var(--text-hi)" }}
          formatter={(v: number) => [unit ? `${v} ${unit}` : `${v}`, "Value"]}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#macro-${uid})`}
          dot={false}
          activeDot={{ r: 3, fill: color, stroke: "var(--raised)", strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
