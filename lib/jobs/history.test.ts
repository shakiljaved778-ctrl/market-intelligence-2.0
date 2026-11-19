import { describe, expect, it } from "vitest";
import { planHistoryRefresh } from "./tasks";
import { historySymbols } from "./tracked";

const NOW = new Date("2026-11-19T22:00:00Z");

describe("price history refresh plan", () => {
  it("fetches a month for complete, current symbols and five years otherwise", () => {
    const spans = new Map([
      ["AAPL", { first: "2021-11-19", last: "2026-11-18" }],
      ["MSFT", { first: "2021-11-19", last: "2026-10-01" }], // stale
      ["META", { first: "2026-10-20", last: "2026-11-18" }], // too shallow
    ]);
    const plan = planHistoryRefresh(["AAPL", "MSFT", "META", "NVDA"], spans, NOW);
    expect(plan.recent).toEqual(["AAPL"]);
    expect(plan.full).toEqual(["MSFT", "META", "NVDA"]);
  });

  it("caps full fills per run; the rest wait for the next run", () => {
    const plan = planHistoryRefresh(["A", "B", "C"], new Map(), NOW, 2);
    expect(plan.full).toEqual(["A", "B"]);
    expect(plan.recent).toEqual([]);
  });

  it("covers every tracked equity, core symbols first, no crypto", () => {
    const syms = historySymbols();
    expect(syms[0]).toBe("AAPL");
    expect(syms).toContain("ANT");
    expect(syms).not.toContain("BTC");
    expect(new Set(syms).size).toBe(syms.length);
  });
});
