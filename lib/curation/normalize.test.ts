import { describe, expect, it } from "vitest";
import { canonicalizeUrl, headlineHash, truncateDek } from "./normalize";

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
