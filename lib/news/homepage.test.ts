import { beforeEach, describe, expect, it } from "vitest";
import { __resetSectionCache } from "@/lib/curation/section";
import type { WireCluster } from "./read";
import {
  buildHomepage,
  GCC_BAND_SIZE,
  NON_FINANCIAL_ROW_SIZE,
  TOP_SLOT_MAX_AGE_H,
} from "./homepage";

const NOW = Date.parse("2026-11-13T12:00:00.000Z");
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000).toISOString();

let n = 0;
function story(section: string, ageH: number, score: number): WireCluster {
  n += 1;
  return {
    slug: `${section}-${n}`,
    title: `${section} story ${n}`,
    tickers: [],
    topics: [],
    entities: [],
    sourceIds: ["src"],
    sourceCount: 1,
    eventTime: hoursAgo(ageH),
    importanceScore: score,
    articleIds: [n],
    primaryId: n,
    section,
    region: "GLOBAL",
    dek: "A real one-sentence description of the story.",
    imageUrl: null,
    imageCredit: null,
  };
}

function allSlots(l: ReturnType<typeof buildHomepage>): WireCluster[] {
  return [
    ...l.gcc,
    ...(l.lead ? [l.lead] : []),
    ...l.heroSide,
    ...l.threeUp,
    ...l.blocks.flatMap((b) => b.stories),
    ...l.latest,
  ];
}

describe("buildHomepage", () => {
  beforeEach(() => __resetSectionCache());

  // Ranked by importance, as readWire returns it.
  const wire = [
    story("science", 2, 90), // strongest, but non-financial
    story("markets", 1600, 85), // 66 days old (the audit's case)
    story("markets", 5, 70),
    story("economy", 10, 65),
    story("health", 20, 60),
    story("markets", 30, 55),
    story("technology", 4, 50),
    story("science", 6, 45),
    story("science", 8, 40),
    story("science", 9, 35),
    story("science", 12, 30),
    story("eureka", 2000, 10),
    story("crypto", 3, 25),
    story("economy", 100, 20), // too old for top slots and for its 48h window
    story("general", 1, 99), // hidden section
  ].sort((a, b) => b.importanceScore - a.importanceScore);

  it("shows every story at most once", () => {
    const slugs = allSlots(buildHomepage(wire, { now: NOW })).map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("never puts a story older than 72 hours in a top slot", () => {
    const l = buildHomepage(wire, { now: NOW });
    for (const c of [l.lead!, ...l.heroSide, ...l.threeUp]) {
      expect(NOW - Date.parse(c.eventTime)).toBeLessThanOrEqual(
        TOP_SLOT_MAX_AGE_H * 3_600_000,
      );
    }
  });

  it("leads with markets and economy, ahead of a stronger science story", () => {
    const l = buildHomepage(wire, { now: NOW });
    expect(["markets", "economy", "crypto", "realestate"]).toContain(l.lead?.section);
    for (const c of l.heroSide) {
      expect(["markets", "economy", "crypto", "realestate"]).toContain(c.section);
    }
  });

  it("caps non-financial sections to one row and lists financial sections first", () => {
    const l = buildHomepage(wire, { now: NOW });
    for (const b of l.blocks.filter((x) => x.row)) {
      expect(b.stories.length).toBeLessThanOrEqual(NON_FINANCIAL_ROW_SIZE);
    }
    const firstRow = l.blocks.findIndex((b) => b.row);
    const lastFinancial = l.blocks.map((b) => b.row).lastIndexOf(false);
    if (firstRow !== -1 && lastFinancial !== -1) {
      expect(lastFinancial).toBeLessThan(firstRow);
    }
  });

  it("keeps stale stories out of section blocks but shows evergreen Eureka", () => {
    const l = buildHomepage(wire, { now: NOW });
    const inBlocks = l.blocks.flatMap((b) => b.stories);
    expect(
      inBlocks.some((c) => c.section === "markets" && c.importanceScore === 85),
    ).toBe(false);
    expect(inBlocks.some((c) => c.section === "eureka")).toBe(true);
  });

  it("never shows the hidden General section", () => {
    expect(
      allSlots(buildHomepage(wire, { now: NOW })).some((c) => c.section === "general"),
    ).toBe(false);
  });

  it("leads with a current editor's pick, but not a stale one", () => {
    const pick = wire.find((c) => c.section === "technology")!;
    const l = buildHomepage(wire, {
      now: NOW,
      featured: { cluster: pick, label: "Editor's pick" },
    });
    expect(l.lead?.slug).toBe(pick.slug);
    expect(l.leadLabel).toBe("Editor's pick");

    const stale = wire.find((c) => c.importanceScore === 85)!;
    const l2 = buildHomepage(wire, {
      now: NOW,
      featured: { cluster: stale, label: "x" },
    });
    expect(l2.lead?.slug).not.toBe(stale.slug);
    expect(l2.leadLabel).toBeNull();
  });

  it("opens with a band of fresh GCC market news, newest first", () => {
    const qa = (ageH: number, score: number) => ({
      ...story("markets", ageH, score),
      region: "QA" as const,
    });
    const older = qa(20, 90);
    const newer = qa(3, 10);
    const global = story("markets", 2, 80);
    const l = buildHomepage([older, global, newer], { now: NOW });
    expect(l.gcc.map((c) => c.slug)).toEqual([newer.slug, older.slug]);
    // The lead is the strongest remaining story; nothing is shown twice.
    expect(l.lead?.slug).toBe(global.slug);
  });

  it("keeps the GCC band to financial sections, fresh stories and its size", () => {
    const gulfScience = { ...story("science", 2, 50), region: "QA" as const };
    const staleGulf = { ...story("economy", 200, 50), region: "SA" as const };
    const many = Array.from({ length: GCC_BAND_SIZE + 2 }, (_, i) => ({
      ...story("economy", i + 1, 40),
      region: "GCC" as const,
    }));
    const l = buildHomepage([gulfScience, staleGulf, ...many], { now: NOW });
    expect(l.gcc).toHaveLength(GCC_BAND_SIZE);
    expect(l.gcc.map((c) => c.slug)).not.toContain(gulfScience.slug);
    expect(l.gcc.map((c) => c.slug)).not.toContain(staleGulf.slug);
  });

  it("has an empty GCC band when there is no GCC news", () => {
    expect(buildHomepage(wire, { now: NOW }).gcc).toEqual([]);
  });

  it("does not repeat an editor's pick in the GCC band", () => {
    const gulf = { ...story("markets", 2, 50), region: "QA" as const };
    const l = buildHomepage([gulf], {
      now: NOW,
      featured: { cluster: gulf, label: "Editor's pick" },
    });
    expect(l.lead?.slug).toBe(gulf.slug);
    expect(l.gcc).toEqual([]);
  });

  it("has no lead when nothing is fresh", () => {
    const old = [story("markets", 500, 50), story("eureka", 900, 5)];
    const l = buildHomepage(old, { now: NOW });
    expect(l.lead).toBeNull();
    expect(
      l.blocks.flatMap((b) => b.stories).every((c) => c.section === "eureka"),
    ).toBe(true);
  });
});
