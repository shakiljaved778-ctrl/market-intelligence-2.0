import { describe, expect, it } from "vitest";
import { parseRobots, pathAllowed } from "./robots";

const ROBOTS = `
User-agent: *
Disallow: /private
Disallow: /admin

User-agent: BadBot
Disallow: /
`;

describe("robots.txt parsing (§10, honoured inside the fetcher)", () => {
  it("collects Disallow rules for the wildcard agent", () => {
    const rules = parseRobots(ROBOTS);
    expect(rules.disallow).toContain("/private");
    expect(rules.disallow).toContain("/admin");
    // Rules under a different named agent are not applied to us.
    expect(rules.disallow.filter((r) => r === "/")).toHaveLength(0);
  });

  it("allows and disallows paths correctly", () => {
    const rules = parseRobots(ROBOTS);
    expect(pathAllowed(rules, "/news/feed.xml")).toBe(true);
    expect(pathAllowed(rules, "/private/x")).toBe(false);
  });
});
