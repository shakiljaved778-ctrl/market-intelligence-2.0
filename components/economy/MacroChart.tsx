"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/**
 * Macro line chart (§4 Recharts). Monochrome chrome; the single series uses the
 * iris accent only when it is our own computed series — here macro is source
 * data, so it stays neutral text-mid. Currency-neutral (levels/percent).
 */
export function MacroChart({
  data,
  color = "var(--text-mid)",
}: {
  data: { date: string; value: number }[];
  color?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <XAxis
          dataKey="date"
          tick={{
            fontSize: 10,
            fill: "var(--text-low)",
            fontFamily: "var(--font-mono)",
          }}
          tickFormatter={(d: string) => d.slice(0, 7)}
          axisLine={{ stroke: "var(--line)" }}
          tickLine={false}
          minTickGap={24}
        />
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
        <Tooltip
          contentStyle={{
            background: "var(--raised)",
            border: "1px solid var(--line)",
            borderRadius: 6,
            fontSize: 12,
          }}
          labelStyle={{ color: "var(--text-mid)" }}
          itemStyle={{ color: "var(--text-hi)" }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
