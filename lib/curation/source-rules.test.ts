import { describe, expect, it } from "vitest";
import type { NormalizedArticle } from "./normalize";
import { applySourceRules, isDealHeadline } from "./ingest";
import { loadSources } from "./config";

const item = (headline: string): NormalizedArticle => ({
  sourceId: "prnewswire-financial",
  url: `https://www.prnewswire.com/news-releases/${headline.length}.html`,
  canonicalUrl: `https://www.prnewswire.com/news-releases/${headline.length}.html`,
  headline,
  dek: "The press release's own summary text.",
  publishedAt: "2026-11-28T10:00:00Z",
  author: null,
  rawHash: headline,
});

describe("PR Newswire: headline and link only, deals only (owner, 2026-11-28)", () => {
  it("is active with both rules on", () => {
    const prn = loadSources().find((s) => s.id === "prnewswire-financial");
    expect(prn?.active).toBe(true);
    expect(prn?.headline_only).toBe(true);
    expect(prn?.deals_only).toBe(true);
  });

  it("keeps deal releases and never stores their description", () => {
    const out = applySourceRules({ headline_only: true, deals_only: true }, [
      item("Acme Capital closes $1.2 billion private equity fund"),
      item("Fintech startup raises $30 million in Series B funding round"),
      item("Gulf Bank announces Q3 dividend date"),
    ]);
    expect(out.map((a) => a.headline)).toEqual([
      "Acme Capital closes $1.2 billion private equity fund",
      "Fintech startup raises $30 million in Series B funding round",
    ]);
    expect(out.every((a) => a.dek === null)).toBe(true);
  });

  it("recognises IPO and M&A headlines", () => {
    expect(
      isDealHeadline("Example Corp announces pricing of initial public offering"),
    ).toBe(true);
    expect(isDealHeadline("Bank reports record quarterly profit")).toBe(false);
  });

  it("leaves other sources untouched", () => {
    const [a] = applySourceRules({}, [item("Gulf Bank announces Q3 dividend date")]);
    expect(a?.dek).toBe("The press release's own summary text.");
  });
});
