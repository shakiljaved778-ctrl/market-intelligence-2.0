import { describe, expect, it } from "vitest";
import type { WireCluster } from "@/lib/news/read";
import { topStories } from "./top-stories";

const NOW = Date.parse("2026-11-20T09:00:00Z");
const s = (slug: string, section: string, region: string, ageH = 2) =>
  ({
    slug,
    section,
    region,
    eventTime: new Date(NOW - ageH * 3_600_000).toISOString(),
  }) as unknown as WireCluster;

describe("topStories — the three broad headlines", () => {
  const wire = [
    s("old-markets", "markets", "GLOBAL", 80),
    s("qa-economy", "economy", "QA"),
    s("us-markets", "markets", "GLOBAL"),
    s("uk-economy", "economy", "GLOBAL"),
    s("sa-markets", "markets", "SA"),
  ];

  it("picks global markets, GCC and general finance, in rank order, fresh only", () => {
    const t = topStories(wire, { now: NOW });
    expect(t.global?.slug).toBe("us-markets");
    expect(t.gcc?.slug).toBe("qa-economy");
    expect(t.finance?.slug).toBe("uk-economy");
  });

  it("leaves the global slot to the Mizaan Original when one exists", () => {
    const t = topStories(wire, { now: NOW, hasOriginal: true });
    expect(t.global).toBeNull();
    expect(t.finance?.slug).toBe("uk-economy");
  });

  it("falls back to another financial story for the finance slot, never repeating one", () => {
    const t = topStories(
      [s("us-markets", "markets", "GLOBAL"), s("eu-markets", "markets", "EU")],
      {
        now: NOW,
      },
    );
    expect(t.global?.slug).toBe("us-markets");
    expect(t.finance?.slug).toBe("eu-markets");
    expect(t.gcc).toBeNull();
  });

  it("falls back to the past week when no fresh story fits a slot", () => {
    const t = topStories(
      [
        s("us-markets", "markets", "GLOBAL"),
        s("qa-week-old", "economy", "QA", 100),
        s("qa-stale", "economy", "QA", 300),
      ],
      { now: NOW },
    );
    expect(t.gcc?.slug).toBe("qa-week-old");
  });
});
