import { describe, expect, it } from "vitest";
import { slowFeedExtras } from "./tasks";

const NOW = Date.parse("2026-11-28T12:00:00Z");
const a = (id: number, sourceId: string, daysAgo: number) => ({
  id,
  sourceId,
  publishedAt: new Date(NOW - daysAgo * 86_400_000).toISOString(),
});

describe("slow specialist feeds are clustered from further back (2026-11-28)", () => {
  it("adds a 4-day-old Investcorp item, never a duplicate or one past its window", () => {
    const base = [a(1, "investcorp", 1)];
    const slow = [
      a(1, "investcorp", 1),
      a(2, "investcorp", 4),
      a(3, "investcorp", 20),
      a(4, "qna", 4),
    ];
    const out = slowFeedExtras(
      base,
      slow,
      new Map([["investcorp", 14 * 86_400_000]]),
      NOW,
    );
    expect(out.map((x) => x.id)).toEqual([2]);
  });
});
