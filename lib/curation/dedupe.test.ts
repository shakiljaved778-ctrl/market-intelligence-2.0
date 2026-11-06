import { describe, expect, it } from "vitest";
import { findDuplicate, isNearDuplicate, titleSimilarity } from "./dedupe";

const A = "Bitcoin rallies to a fresh high as institutional inflows build";
const B = "Bitcoin rallies as institutional inflows accelerate";
const C = "Fed holds interest rates steady, signals patience on cuts";

describe("titleSimilarity", () => {
  it("scores paraphrases of the same story high and distinct stories low", () => {
    expect(titleSimilarity(A, B)).toBeGreaterThanOrEqual(0.45);
    expect(titleSimilarity(A, C)).toBeLessThan(0.15);
  });

  it("is 1.0 for identical titles", () => {
    expect(titleSimilarity(A, A)).toBe(1);
  });
});

describe("isNearDuplicate", () => {
  it("catches the near-identical crypto headlines, not unrelated ones", () => {
    expect(isNearDuplicate(A, B, 0.45)).toBe(true);
    expect(isNearDuplicate(A, C, 0.45)).toBe(false);
  });
});

describe("findDuplicate", () => {
  const now = Date.parse("2026-11-01T12:00:00.000Z");
  const existing = [
    { title: A, section: "crypto", publishedAt: "2026-11-01T06:00:00.000Z" }, // 6h ago
    { title: C, section: "economy", publishedAt: "2026-11-01T06:00:00.000Z" },
  ];

  it("merges a same-section near-duplicate inside the window", () => {
    const dup = findDuplicate(
      { title: B, section: "crypto", publishedAt: "2026-11-01T11:00:00.000Z" },
      existing,
      { now, threshold: 0.45 },
    );
    expect(dup?.title).toBe(A);
  });

  it("does not merge across sections", () => {
    const dup = findDuplicate(
      { title: B, section: "markets", publishedAt: "2026-11-01T11:00:00.000Z" },
      existing,
      { now, threshold: 0.45 },
    );
    expect(dup).toBeNull();
  });

  it("ignores matches outside the 72h window", () => {
    const old = [
      { title: A, section: "crypto", publishedAt: "2026-10-20T06:00:00.000Z" },
    ];
    const dup = findDuplicate(
      { title: B, section: "crypto", publishedAt: "2026-11-01T11:00:00.000Z" },
      old,
      { now, threshold: 0.45 },
    );
    expect(dup).toBeNull();
  });
});
