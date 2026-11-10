import { describe, expect, it } from "vitest";
import { pickFeatured } from "./featured";
import type { WireCluster } from "./read";

function wc(over: Partial<WireCluster>): WireCluster {
  return {
    slug: "s",
    title: "t",
    tickers: [],
    topics: [],
    entities: [],
    sourceIds: [],
    sourceCount: 1,
    eventTime: "2026-01-01T00:00:00.000Z",
    importanceScore: 1,
    articleIds: [1],
    primaryId: 1,
    section: "markets",
    dek: null,
    imageUrl: null,
    imageCredit: null,
    ...over,
  };
}

/**
 * Editor's Pick reads content/featured.yaml (the shipped Nvidia rule). It must
 * promote a real in-wire story matching a rule, and never pin when none match.
 */
describe("editor's pick (content/featured.yaml)", () => {
  it("promotes the first wire story whose title matches a rule (Nvidia)", () => {
    const clusters = [
      wc({ slug: "a", title: "Fed holds rates steady" }),
      wc({ slug: "b", title: "Nvidia CEO unveils next-generation AI chip" }),
    ];
    const f = pickFeatured(clusters);
    expect(f?.cluster.slug).toBe("b");
    expect(f?.label.length).toBeGreaterThan(0);
  });

  it("returns null when no story matches any rule", () => {
    expect(
      pickFeatured([wc({ slug: "a", title: "Fed holds rates steady" })]),
    ).toBeNull();
  });
});
