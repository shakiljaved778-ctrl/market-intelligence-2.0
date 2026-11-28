import { describe, expect, it } from "vitest";
import { earningsForUniverse, iposInWindow } from "./calendar";

const NOW = Date.parse("2026-11-28T09:00:00Z");

describe("calendars (brief §5)", () => {
  it("keeps upcoming earnings for names in the universe only, soonest first", () => {
    const rows = [
      { date: "2026-12-10", symbol: "ORCL" },
      { date: "2026-12-02", symbol: "CRM" },
      { date: "2026-12-03", symbol: "ZZZZ" },
      { date: "2026-11-20", symbol: "NVDA" },
    ];
    const out = earningsForUniverse(rows, new Set(["ORCL", "CRM", "NVDA"]), NOW);
    expect(out.map((r) => r.symbol)).toEqual(["CRM", "ORCL"]);
  });

  it("keeps IPOs from the past week and the next month, newest first", () => {
    const rows = [
      { date: "2026-11-19", name: "Anthropic", symbol: "ANT" },
      { date: "2026-11-25", name: "A Co", symbol: "ACO" },
      { date: "2026-12-15", name: "B Co", symbol: "BCO" },
      { date: "2027-02-01", name: "C Co", symbol: "CCO" },
    ];
    expect(iposInWindow(rows, NOW).map((r) => r.symbol)).toEqual(["BCO", "ACO"]);
  });
});
