import { describe, expect, it } from "vitest";
import { parseBlocks } from "./ArticleBody";

describe("ArticleBody parseBlocks", () => {
  it("turns '## Heading' lines into headings and keeps paragraphs", () => {
    const md = [
      "Opening paragraph.",
      "## The details\nFirst detail sentence.\nSame paragraph.",
      "## Background",
      "Context paragraph.",
      "**Why it matters:** One sentence.",
    ].join("\n\n");
    expect(parseBlocks(md)).toEqual([
      { kind: "paragraph", text: "Opening paragraph." },
      { kind: "heading", text: "The details" },
      { kind: "paragraph", text: "First detail sentence. Same paragraph." },
      { kind: "heading", text: "Background" },
      { kind: "paragraph", text: "Context paragraph." },
      { kind: "paragraph", text: "**Why it matters:** One sentence." },
    ]);
  });

  it("reads an older plain-paragraph brief unchanged", () => {
    expect(parseBlocks("One.\n\nTwo.")).toEqual([
      { kind: "paragraph", text: "One." },
      { kind: "paragraph", text: "Two." },
    ]);
  });

  it("strips bold markers from a heading and ignores trailing hashes", () => {
    expect(parseBlocks("### **What to watch** ##")).toEqual([
      { kind: "heading", text: "What to watch" },
    ]);
  });
});
