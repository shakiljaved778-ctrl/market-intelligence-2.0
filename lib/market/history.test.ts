import { describe, expect, it } from "vitest";
import type { Candle } from "@/lib/providers/types";
import { priceHistory } from "./history";

function bar(date: string, c: number, extra: Partial<Candle> = {}): Candle {
  return { t: `${date}T00:00:00.000Z`, o: c, h: c + 1, l: c - 1, c, v: 1000, ...extra };
}

describe("priceHistory", () => {
  it("is empty with no stored bars — never invented", () => {
    const h = priceHistory([]);
    expect(h.sessions).toEqual([]);
    expect(h.returns.every((r) => r.pct === null)).toBe(true);
    expect(h.high52w).toBeNull();
  });

  it("computes period returns from the first close in each period", () => {
    const bars = [
      bar("2025-11-19", 100),
      bar("2026-01-02", 110),
      bar("2026-05-19", 120),
      bar("2026-10-19", 150),
      bar("2026-11-18", 160),
      bar("2026-11-19", 165),
    ];
    const h = priceHistory(bars);
    const r = Object.fromEntries(h.returns.map((x) => [x.period, x]));
    expect(r["1Y"]!.pct).toBeCloseTo(65, 6);
    expect(r["1Y"]!.from).toBe("2025-11-19");
    expect(r["YTD"]!.pct).toBeCloseTo((165 / 110 - 1) * 100, 6);
    expect(r["6M"]!.pct).toBeCloseTo((165 / 120 - 1) * 100, 6);
    expect(r["1M"]!.pct).toBeCloseTo(10, 6);
    // History does not reach back five years → no 5Y figure.
    expect(r["5Y"]!.pct).toBeNull();
  });

  it("lists recent sessions newest first with day-on-day change", () => {
    const h = priceHistory(
      [bar("2026-11-17", 100), bar("2026-11-18", 110), bar("2026-11-19", 99)],
      2,
    );
    expect(h.sessions.map((s) => s.date)).toEqual(["2026-11-19", "2026-11-18"]);
    expect(h.sessions[0]!.changePct).toBeCloseTo(-10, 6);
    expect(h.sessions[1]!.changePct).toBeCloseTo(10, 6);
    expect(h.lastDate).toBe("2026-11-19");
    expect(h.firstDate).toBe("2026-11-17");
  });

  it("takes the 52-week range from highs and lows, not closes", () => {
    const h = priceHistory([
      bar("2026-11-17", 100, { h: 130, l: 90 }),
      bar("2026-11-18", 110),
      bar("2026-11-19", 105),
    ]);
    expect(h.high52w).toBe(130);
    expect(h.low52w).toBe(90);
  });

  it("a just-listed stock shows its sessions but no period returns", () => {
    const h = priceHistory([bar("2026-11-19", 111.5)]);
    expect(h.sessions).toHaveLength(1);
    expect(h.sessions[0]!.changePct).toBeNull();
    expect(h.returns.every((r) => r.pct === null)).toBe(true);
  });
});
