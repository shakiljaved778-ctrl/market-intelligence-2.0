import { describe, expect, it } from "vitest";
import { sparkPaths } from "./MacroSpark";

describe("sparkPaths", () => {
  it("scales points across the box, highest value at the top", () => {
    const p = sparkPaths(
      [
        { date: "a", value: 1 },
        { date: "b", value: 3 },
        { date: "c", value: 2 },
      ],
      100,
      50,
      0,
    );
    expect(p?.line).toBe("M0.0,50.0 L50.0,0.0 L100.0,25.0");
    expect(p?.area.endsWith("L100,50 L0,50 Z")).toBe(true);
  });
  it("draws nothing for fewer than two points", () => {
    expect(sparkPaths([{ date: "a", value: 1 }], 100, 50)).toBeNull();
  });
  it("draws a flat series as a level line", () => {
    const p = sparkPaths(
      [
        { date: "a", value: 2 },
        { date: "b", value: 2 },
      ],
      10,
      10,
      0,
    );
    expect(p?.line).toBe("M0.0,10.0 L10.0,10.0");
  });
});
