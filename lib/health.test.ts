import { describe, expect, it } from "vitest";
import { assess, limitsAt, overall, type PipelineHealth } from "./health";

const now = Date.parse("2026-11-27T15:00:00Z");
const ago = (min: number) => new Date(now - min * 60_000).toISOString();

describe("health assessment", () => {
  it("is ok within the limit, degraded up to 3x, down beyond or when missing", () => {
    expect(assess(ago(30), 60, now)).toEqual({ ageMin: 30, status: "ok" });
    expect(assess(ago(120), 60, now).status).toBe("degraded");
    expect(assess(ago(200), 60, now).status).toBe("down");
    expect(assess(null, 60, now)).toEqual({ ageMin: null, status: "down" });
  });

  it("takes the overall status from critical pipelines only", () => {
    const p = (name: string, status: PipelineHealth["status"], critical: boolean) => ({
      name,
      lastAt: null,
      ageMin: null,
      limitMin: 60,
      status,
      critical,
    });
    expect(overall([p("news", "ok", true), p("energy", "down", false)])).toBe("ok");
    expect(overall([p("news", "degraded", true), p("fx", "ok", true)])).toBe(
      "degraded",
    );
    expect(overall([p("news", "down", true), p("fx", "ok", true)])).toBe("down");
  });

  it("expects fresh US prices only while the US market is open", () => {
    // 15:00Z Wednesday = 10:00 New York → open.
    expect(limitsAt(new Date("2026-11-25T15:00:00Z")).equities).toBe(45);
    // Saturday → the last close may be days old.
    expect(limitsAt(new Date("2026-11-28T15:00:00Z")).equities).toBe(4 * 24 * 60);
  });
});
