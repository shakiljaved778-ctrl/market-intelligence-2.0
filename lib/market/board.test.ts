import { describe, expect, it } from "vitest";
import { lastChangePct } from "./board";
import { INDEX_TRACKERS } from "@/content/index-board";
import { INSTRUMENTS } from "@/content/instruments";
import { TRACKED_SYMBOLS } from "@/lib/jobs/tracked";

describe("index board", () => {
  it("computes the change between the last two observations", () => {
    expect(lastChangePct([{ value: 4 }, { value: 5 }])).toBeCloseTo(25);
    expect(lastChangePct([{ value: 5 }])).toBeNull();
    expect(lastChangePct([{ value: 0 }, { value: 5 }])).toBeNull();
  });

  it("refreshes every tracker in the quotes job", () => {
    for (const t of INDEX_TRACKERS) expect(TRACKED_SYMBOLS).toContain(t.symbol);
  });

  it("keeps the ETF trackers out of the stock universe (movers, screener)", () => {
    const universe = new Set(INSTRUMENTS.map((i) => i.symbol));
    for (const t of INDEX_TRACKERS) expect(universe.has(t.symbol)).toBe(false);
  });
});
