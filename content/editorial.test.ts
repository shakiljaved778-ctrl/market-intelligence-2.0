import { describe, expect, it } from "vitest";
import {
  EDITORIAL_ARTICLES,
  EDITORIAL_TTL_HOURS,
  isEditorialCurrent,
  type EditorialArticle,
} from "./editorial";

const NOW = Date.parse("2026-11-12T12:00:00.000Z");

function entry(over: Partial<EditorialArticle>): EditorialArticle {
  return {
    id: 90001,
    sourceId: "example",
    sourceName: "Example",
    tier: "outlet",
    trustScore: 80,
    headline: "Example headline",
    dek: "An attributed one-line summary written by someone who read the article.",
    url: "https://example.com/story",
    publishedAt: "2026-11-12T06:00:00.000Z",
    ...over,
  };
}

describe("editorial picks expire", () => {
  it("is current inside the 72-hour window and dropped after it", () => {
    expect(EDITORIAL_TTL_HOURS).toBe(72);
    expect(isEditorialCurrent(entry({}), NOW)).toBe(true);
    expect(
      isEditorialCurrent(entry({ publishedAt: "2026-11-09T11:00:00.000Z" }), NOW),
    ).toBe(false);
  });

  it("honours an explicit earlier expiry", () => {
    expect(
      isEditorialCurrent(entry({ expiresAt: "2026-11-12T10:00:00.000Z" }), NOW),
    ).toBe(false);
  });

  it("rejects an unparseable date rather than keeping the entry for ever", () => {
    expect(isEditorialCurrent(entry({ publishedAt: "not a date" }), NOW)).toBe(false);
  });

  it("every committed entry has a link, a dek of at most 40 words and a unique id", () => {
    const ids = new Set<number>();
    for (const a of EDITORIAL_ARTICLES) {
      expect(a.url).toMatch(/^https:\/\//);
      expect((a.dek ?? "").split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(40);
      expect(a.id).toBeGreaterThanOrEqual(90000);
      expect(ids.has(a.id)).toBe(false);
      ids.add(a.id);
    }
  });
});
