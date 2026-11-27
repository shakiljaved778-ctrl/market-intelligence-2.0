import { describe, expect, it } from "vitest";
import { firstSentence, keyTakeaways } from "./takeaways";

const BRIEF = [
  "The U.S. Federal Reserve held rates at 4.25% on Wednesday. Officials cited cooling inflation.",
  "## The details",
  "The decision was unanimous among the 12 voting members. It followed two cuts this year.",
  "## Market context",
  "The S&P 500 rose 0.8% after the statement, led by banks. Treasury yields fell.",
  "## Background",
  "A central bank sets short-term interest rates to manage inflation.",
  "## What to watch",
  "The facts leave open when the next decision is due.",
  "**Why it matters:** Borrowing costs stay unchanged for households and firms.",
].join("\n\n");

describe("key takeaways", () => {
  it("keeps abbreviations and decimals inside the first sentence", () => {
    expect(firstSentence("The U.S. Fed held at 4.25% today. Next.")).toBe(
      "The U.S. Fed held at 4.25% today.",
    );
  });

  it("takes the opening, substantive sections and the closing line", () => {
    const t = keyTakeaways(BRIEF);
    expect(t).toEqual([
      "The U.S. Federal Reserve held rates at 4.25% on Wednesday.",
      "The decision was unanimous among the 12 voting members.",
      "The S&P 500 rose 0.8% after the statement, led by banks.",
      "Borrowing costs stay unchanged for households and firms.",
    ]);
  });

  it("skips Background and What to watch", () => {
    const t = keyTakeaways(BRIEF).join(" ");
    expect(t).not.toMatch(/central bank sets/);
    expect(t).not.toMatch(/leave open/);
  });

  it("returns nothing for a body too thin to summarise", () => {
    expect(keyTakeaways("Just one short line.")).toEqual([]);
  });

  it("handles a Mizaan Original's bottom line", () => {
    const md = [
      "Oil prices rose 2% as supply worries grew across the Gulf region.",
      "## What moved",
      "Brent crude gained 2.1% to settle near its weekly high on Friday.",
      "## What it means for the Gulf",
      "The Qatar Stock Exchange index rose 0.4% as energy shares advanced.",
      "**The bottom line:** Energy led a broad rally across regional markets.",
    ].join("\n\n");
    expect(keyTakeaways(md)).toHaveLength(4);
    expect(keyTakeaways(md).at(-1)).toBe(
      "Energy led a broad rally across regional markets.",
    );
  });
});
