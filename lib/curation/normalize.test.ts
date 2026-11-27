import { describe, expect, it } from "vitest";
import { canonicalizeUrl, cleanText, headlineHash, truncateDek } from "./normalize";

describe("truncateDek (§10 ≤40 words)", () => {
  it("caps a dek at 40 words", () => {
    const long = Array.from({ length: 60 }, (_, i) => `w${i}`).join(" ");
    expect(truncateDek(long)?.split(" ")).toHaveLength(40);
  });
  it("returns null for empty input", () => {
    expect(truncateDek(null)).toBeNull();
    expect(truncateDek("   ")).toBeNull();
  });
});

describe("canonicalizeUrl", () => {
  it("strips tracking params and www, drops the fragment", () => {
    expect(canonicalizeUrl("https://www.example.com/a?utm_source=x&id=5#frag")).toBe(
      "https://example.com/a?id=5",
    );
  });
});

describe("headlineHash (dedupe)", () => {
  it("is stable and case/whitespace-insensitive", () => {
    expect(headlineHash("Fed holds rates")).toBe(headlineHash("  fed   HOLDS rates "));
    expect(headlineHash("a")).not.toBe(headlineHash("b"));
  });
});

describe("cleanText", () => {
  it("removes zero-width and control characters", () => {
    expect(cleanText("FIBA ​​Basketball World Cup")).toBe("FIBA Basketball World Cup");
    expect(cleanText("Bad\u0007 bell")).toBe("Bad bell");
  });
  it("decodes entities once and fixes a space before punctuation", () => {
    expect(cleanText("AT&amp;T&#39;s deal &amp;#39;")).toBe("AT&T's deal &#39;");
    expect(cleanText("Qatar Tourism , Signs MoU")).toBe("Qatar Tourism, Signs MoU");
    expect(cleanText("Price &#99999999; ok")).toBe("Price &#99999999; ok");
  });
  it("keeps decimals and collapses whitespace", () => {
    expect(cleanText("GDP  grew   0.2 percent .")).toBe("GDP grew 0.2 percent.");
  });
});
