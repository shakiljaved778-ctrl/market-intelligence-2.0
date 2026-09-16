import { describe, expect, it } from "vitest";
import { rangeToWindow, ymd } from "./range";

const now = new Date(Date.UTC(2026, 8, 16, 12, 0, 0)); // 2026-09-16

describe("rangeToWindow", () => {
  it("uses intraday bars for 1D/5D and daily/weekly for longer ranges", () => {
    expect(rangeToWindow("1D", now).intraday).toBe(true);
    expect(rangeToWindow("5D", now).intraday).toBe(true);
    expect(rangeToWindow("1M", now).intraday).toBe(false);
    expect(rangeToWindow("5Y", now).timespan).toBe("week");
  });

  it("anchors YTD to Jan 1 of the current year", () => {
    expect(ymd(rangeToWindow("YTD", now).from)).toBe("2026-01-01");
  });

  it("goes back one calendar year for 1Y", () => {
    expect(ymd(rangeToWindow("1Y", now).from)).toBe("2025-09-16");
  });
});
