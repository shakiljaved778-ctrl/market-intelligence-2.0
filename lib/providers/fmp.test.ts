import { describe, expect, it } from "vitest";
import { parseEodBars } from "./fmp";

describe("FMP end-of-day bars", () => {
  it("parses the stable flat array, oldest first", () => {
    const bars = parseEodBars([
      {
        symbol: "AAPL",
        date: "2026-11-18",
        open: 2,
        high: 3,
        low: 1,
        close: 2.5,
        volume: 10,
      },
      {
        symbol: "AAPL",
        date: "2026-11-17",
        open: 1,
        high: 2,
        low: 0.5,
        close: 1.5,
        volume: null,
      },
    ]);
    expect(bars.map((b) => b.t)).toEqual([
      "2026-11-17T00:00:00.000Z",
      "2026-11-18T00:00:00.000Z",
    ]);
    expect(bars[0]).toMatchObject({ o: 1, h: 2, l: 0.5, c: 1.5, v: null });
  });

  it("parses the legacy { historical } shape", () => {
    expect(
      parseEodBars({
        symbol: "AAPL",
        historical: [{ date: "2026-11-18", open: 2, high: 3, low: 1, close: 2.5 }],
      }),
    ).toHaveLength(1);
  });

  it("yields nothing for an error body or malformed rows — never a made-up bar", () => {
    expect(parseEodBars({ "Error Message": "Premium endpoint" })).toEqual([]);
    expect(
      parseEodBars([
        { date: "2026-11-18", open: 2, high: 3, low: 1 },
        { date: "yesterday", open: 2, high: 3, low: 1, close: 2 },
        { date: "2026-11-18", open: 2, high: 3, low: 1, close: 0 },
      ]),
    ).toEqual([]);
  });
});
