import { describe, expect, it } from "vitest";
import type { MacroSeries } from "./read";
import { MIN_POINTS, pickChartOfDay } from "./chart-of-day";

const series = (id: string, values: number[], demo = false): MacroSeries => ({
  id,
  name: id,
  unit: "%",
  frequency: "monthly",
  source: "FRED",
  region: "US",
  observations: values.map((value, i) => ({
    date: `2025-${String((i % 12) + 1).padStart(2, "0")}-01`,
    value,
  })),
  asOf: null,
  method: null,
  demo,
});

const long = (v0: number, v1: number) => [v0, ...Array(MIN_POINTS - 2).fill(3), v1];

describe("Chart of the Day (brief §9.4)", () => {
  it("rotates daily through series with enough real history", () => {
    const all = [series("B", long(4, 3)), series("A", long(2, 5)), series("C", [1, 2])];
    const day = 86_400_000;
    const ids = [0, 1, 2, 3].map((d) => pickChartOfDay(all, d * day)?.series.id);
    expect(ids).toEqual(["A", "B", "A", "B"]);
  });

  it("captions with the two stored readings and the source, nothing computed", () => {
    const c = pickChartOfDay([series("CPI", long(2.9, 3.1))], 0);
    expect(c?.caption[0]).toContain("3.1%");
    expect(c?.caption[1]).toMatch(/^Up from 2\.9% on .* Source: FRED\.$/);
  });

  it("never picks demo data, and returns null without real history", () => {
    expect(pickChartOfDay([series("X", long(1, 2), true)], 0)).toBeNull();
  });
});
