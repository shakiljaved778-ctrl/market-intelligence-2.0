import { describe, expect, it } from "vitest";
import type { WireCluster } from "./read";
import { SECTION_FRESH_MIN, relatedSection, sectionFill } from "./section-fill";

const NOW = Date.parse("2026-11-28T09:00:00Z");
let n = 0;
const story = (section: string, ageH: number) =>
  ({
    slug: `${section}-${(n += 1)}`,
    section,
    eventTime: new Date(NOW - ageH * 3_600_000).toISOString(),
  }) as WireCluster;

describe("section freshness fill (brief §4.5)", () => {
  it("adds a 'More from' row when a section has fewer than six fresh stories", () => {
    const wire = [
      story("crypto", 2),
      story("crypto", 200),
      story("markets", 3),
      story("markets", 5),
    ];
    const fill = sectionFill("crypto", wire, NOW);
    expect(fill?.section).toBe("markets");
    expect(fill?.stories).toHaveLength(2);
  });

  it("adds nothing when the section meets its SLO", () => {
    const wire = Array.from({ length: SECTION_FRESH_MIN }, () => story("sports", 1));
    expect(sectionFill("sports", [...wire, story("world", 1)], NOW)).toBeNull();
  });

  it("never fills with stale stories, and defaults to World", () => {
    expect(sectionFill("sports", [story("world", 100)], NOW)).toBeNull();
    expect(relatedSection("sports")).toBe("world");
  });
});
