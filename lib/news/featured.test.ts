import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import { applyPicks, pickFeatured } from "./featured";
import type { WireCluster } from "./read";

const NOW = Date.parse("2026-11-12T12:00:00.000Z");
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000).toISOString();

function wc(over: Partial<WireCluster>): WireCluster {
  return {
    slug: "s",
    title: "t",
    tickers: [],
    topics: [],
    entities: [],
    sourceIds: [],
    sourceCount: 1,
    eventTime: hoursAgo(1),
    importanceScore: 1,
    articleIds: [1],
    primaryId: 1,
    section: "markets",
    region: "GLOBAL",
    dek: null,
    imageUrl: null,
    imageCredit: null,
    ...over,
  };
}

describe("editor's pick", () => {
  const wire = [
    wc({ slug: "fed-holds", title: "Fed holds rates steady" }),
    wc({ slug: "qnb-results", title: "QNB reports third-quarter results" }),
  ];

  it("promotes the story named by an exact slug", () => {
    const f = applyPicks([{ label: "Editor's pick", slug: "qnb-results" }], wire, NOW);
    expect(f?.cluster.slug).toBe("qnb-results");
    expect(f?.label).toBe("Editor's pick");
  });

  it("does not pin a story older than 72 hours", () => {
    const old = [wc({ slug: "qnb-results", eventTime: hoursAgo(73) })];
    expect(applyPicks([{ label: "x", slug: "qnb-results" }], old, NOW)).toBeNull();
    const fresh = [wc({ slug: "qnb-results", eventTime: hoursAgo(71) })];
    expect(
      applyPicks([{ label: "x", slug: "qnb-results" }], fresh, NOW),
    ).not.toBeNull();
  });

  it("stops applying after its `until` time", () => {
    const pick = { label: "x", slug: "qnb-results", until: "2026-11-12T11:00:00.000Z" };
    expect(applyPicks([pick], wire, NOW)).toBeNull();
  });

  it("returns null when the slug is not on the wire", () => {
    expect(applyPicks([{ label: "x", slug: "missing" }], wire, NOW)).toBeNull();
  });

  it("a configured pick never applies to a story that is not on the wire", () => {
    // content/featured.yaml names real live slugs; none is in this test wire.
    expect(pickFeatured(wire)).toBeNull();
  });

  it("every configured pick names a slug and a hard stop (content/featured.yaml)", () => {
    const raw = parse(
      readFileSync(join(process.cwd(), "content", "featured.yaml"), "utf8"),
    ) as { picks?: { slug?: string; until?: string }[] };
    for (const p of raw.picks ?? []) {
      expect(p.slug).toMatch(/^[a-z0-9-]+$/);
      expect(Number.isFinite(Date.parse(p.until ?? ""))).toBe(true);
    }
  });
});
