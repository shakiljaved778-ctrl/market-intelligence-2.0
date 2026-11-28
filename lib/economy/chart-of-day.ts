import type { MacroSeries } from "./read";

/**
 * Chart of the Day (brief §9.4, 2026-11-28; behind the "chartOfDay" flag).
 * Deterministic: one stored series per day, rotating through those with enough
 * history, and a two-line caption built only from two stored observations and
 * the series' own source — no model, no computed figures.
 */
export const MIN_POINTS = 12;

export interface ChartOfDay {
  series: MacroSeries;
  caption: [string, string];
}

const fmt = (v: number, unit: string) => (unit === "%" ? `${v}%` : `${v} ${unit}`);

const dateLabel = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/** PURE: today's chart, or null when no series has enough real history. */
export function pickChartOfDay(series: MacroSeries[], now: number): ChartOfDay | null {
  const eligible = series
    .filter((s) => !s.demo && s.observations.length >= MIN_POINTS)
    .sort((a, b) => a.id.localeCompare(b.id));
  if (eligible.length === 0) return null;
  const dayNumber = Math.floor(now / 86_400_000);
  const s = eligible[dayNumber % eligible.length] as MacroSeries;
  const last = s.observations.at(-1) as { date: string; value: number };
  const first = s.observations[0] as { date: string; value: number };
  const dir =
    last.value > first.value
      ? "Up from"
      : last.value < first.value
        ? "Down from"
        : "Unchanged from";
  return {
    series: s,
    caption: [
      `${s.name}: ${fmt(last.value, s.unit)} in the latest reading (${dateLabel(last.date)}).`,
      `${dir} ${fmt(first.value, s.unit)} on ${dateLabel(first.date)}. Source: ${s.source}.`,
    ],
  };
}
