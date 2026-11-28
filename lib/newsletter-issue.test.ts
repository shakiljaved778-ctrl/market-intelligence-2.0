import { describe, expect, it } from "vitest";
import type { WireCluster } from "@/lib/news/read";
import { buildMorningIssue } from "./newsletter-issue";

const NOW = Date.parse("2026-11-28T03:00:00Z");
let n = 0;
const story = (section: string, ageH: number, title = `${section} story`) =>
  ({
    slug: `${section}-${(n += 1)}`,
    title: `${title} ${n}`,
    dek: "A one-sentence description <b>with</b> markup.",
    section,
    sourceCount: 2,
    eventTime: new Date(NOW - ageH * 3_600_000).toISOString(),
  }) as WireCluster;

describe("Mizaan Morning issue", () => {
  it("takes the five strongest fresh stories, at most two per section", () => {
    const wire = [
      story("markets", 1),
      story("markets", 2),
      story("markets", 3),
      story("economy", 4),
      story("eureka", 1),
      story("world", 30),
      story("technology", 5),
      story("sports", 6),
    ];
    const issue = buildMorningIssue(wire, NOW, "https://www.mizaan.tech");
    expect(issue?.slugs.map((s) => s.split("-")[0])).toEqual([
      "markets",
      "markets",
      "economy",
      "technology",
      "sports",
    ]);
    expect(issue?.name).toBe("Mizaan Morning 2026-11-28");
    expect(issue?.text).toContain("https://www.mizaan.tech/news/markets-");
    expect(issue?.text).toContain("{{{RESEND_UNSUBSCRIBE_URL}}}");
    expect(issue?.html).not.toContain("<b>with</b>");
    expect(issue?.text).toContain("not investment advice");
  });

  it("sends nothing when fewer than three fresh stories exist", () => {
    expect(
      buildMorningIssue([story("markets", 1), story("world", 50)], NOW, "https://x"),
    ).toBeNull();
  });
});
