import { describe, expect, it } from "vitest";
import { convertFromUsd, neutral } from "./convert";
import { QAR_PER_USD } from "./peg";

describe("convertFromUsd", () => {
  it("passes USD through unchanged", () => {
    expect(convertFromUsd(1284.5, "USD")).toBe(1284.5);
  });

  it("applies the official peg for QAR", () => {
    expect(convertFromUsd(1000, "QAR")).toBeCloseTo(1000 * QAR_PER_USD, 6);
  });
});

describe("neutral (currency-neutral rule §7)", () => {
  it("never converts percentages, ratios or index levels", () => {
    // Whatever the display currency, a neutral value is the identity.
    for (const value of [0, -2.3, 5487.03, 100]) {
      expect(neutral(value)).toBe(value);
    }
  });
});
