import { describe, expect, it } from "vitest";
import type { WireCluster } from "@/lib/news/read";
import { LIVE_TICKER_SIZE, liveTicker } from "./live";

const NOW = Date.parse("2026-11-19T18:00:00.000Z");
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000).toISOString();

function story(slug: string, ageH: number, ids: number[] = [1], section = "markets") {
  return {
    slug,
    title: slug,
    eventTime: hoursAgo(ageH),
    articleIds: ids,
    section,
  } as unknown as WireCluster;
}

describe("liveTicker", () => {
  it("puts the editor-flagged live story first, then the newest fresh stories", () => {
    const ranked = [
      story("old-but-high", 30),
      story("fresh-2h", 2),
      story("anthropic-ipo", 9, [90101, 90102]),
      story("fresh-1h", 1),
    ];
    const items = liveTicker(ranked, new Set([90101]), NOW);
    expect(items.map((i) => i.cluster.slug)).toEqual([
      "anthropic-ipo",
      "fresh-1h",
      "fresh-2h",
    ]);
    expect(items[0]!.flagged).toBe(true);
    expect(items[1]!.flagged).toBe(false);
  });

  it("never shows a stale story or an evergreen explainer as live", () => {
    const items = liveTicker(
      [story("yesterday", 20), story("nobel", 1, [5], "eureka")],
      new Set(),
      NOW,
    );
    expect(items).toEqual([]);
  });

  it("is capped", () => {
    const ranked = Array.from({ length: 20 }, (_, i) => story(`s${i}`, i * 0.2));
    expect(liveTicker(ranked, new Set(), NOW)).toHaveLength(LIVE_TICKER_SIZE);
  });
});
