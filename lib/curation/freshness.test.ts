import { describe, expect, it } from "vitest";
import { isFresh, maxAgeHours, showsAgeStamp } from "./freshness";

const NOW = Date.parse("2026-11-01T12:00:00.000Z");
const hoursAgo = (h: number) => new Date(NOW - h * 3600 * 1000).toISOString();

describe("freshness windows", () => {
  it("applies the per-section windows", () => {
    expect(maxAgeHours("markets")).toBe(48);
    expect(maxAgeHours("world")).toBe(72);
    expect(maxAgeHours("science")).toBe(168);
    expect(maxAgeHours("eureka")).toBeNull();
    expect(maxAgeHours("unknown")).toBe(72); // default
  });

  it("keeps fresh markets stories and drops stale ones", () => {
    expect(isFresh("markets", hoursAgo(12), NOW)).toBe(true);
    expect(isFresh("markets", hoursAgo(60), NOW)).toBe(false); // > 48h
  });

  it("gives science a 7-day window", () => {
    expect(isFresh("science", hoursAgo(100), NOW)).toBe(true);
    expect(isFresh("science", hoursAgo(200), NOW)).toBe(false); // > 168h
  });

  it("treats Eureka as evergreen and stamp-less", () => {
    expect(isFresh("eureka", hoursAgo(73 * 24), NOW)).toBe(true); // 73 days old, still shown
    expect(showsAgeStamp("eureka")).toBe(false);
    expect(showsAgeStamp("markets")).toBe(true);
  });
});
