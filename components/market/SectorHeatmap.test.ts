import { describe, expect, it } from "vitest";
import { staleTiles } from "./SectorHeatmap";

const row = (symbol: string, asOf: string | null) => ({ symbol, priced: { asOf } });

describe("staleTiles (brief §2.2)", () => {
  it("flags a tile that missed the latest session, with its date", () => {
    const stale = staleTiles([
      row("AAPL", "2026-11-27T21:00:00Z"),
      row("MSFT", "2026-11-27T20:55:00Z"),
      row("LIN", "2026-11-25T21:00:00Z"),
    ]);
    expect([...stale.keys()]).toEqual(["LIN"]);
    expect(stale.get("LIN")).toBe("26 Nov"); // 00:00 Doha time on the 26th
  });

  it("flags nothing when every price is from the same session", () => {
    expect(
      staleTiles([row("A", "2026-11-27T14:30:00Z"), row("B", "2026-11-27T21:00:00Z")])
        .size,
    ).toBe(0);
    expect(staleTiles([row("A", null)]).size).toBe(0);
  });
});
