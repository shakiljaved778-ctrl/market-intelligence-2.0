import { beforeEach, describe, expect, it } from "vitest";
import { __resetClassifyCache, classify } from "./classify";

describe("classify (deterministic, dictionary-driven)", () => {
  beforeEach(() => __resetClassifyCache());

  it("detects entity and topic for a Fed headline", () => {
    const c = classify(
      "Federal Reserve holds interest rates steady",
      "FOMC keeps policy rate",
    );
    expect(c.entities).toContain("Federal Reserve");
    expect(c.topics).toContain("monetary_policy");
  });

  it("resolves a ticker from a company alias", () => {
    const c = classify(
      "Apple unveils new product line",
      "Apple heads into holiday quarter",
    );
    expect(c.tickers).toContain("AAPL");
  });

  it("tags energy + OPEC for an oil story", () => {
    const c = classify(
      "OPEC+ holds output as Brent slides",
      "Crude prices fell after the meeting",
    );
    expect(c.topics).toContain("energy");
    expect(c.entities).toContain("OPEC");
  });

  it("returns empty arrays when nothing matches", () => {
    const c = classify("A quiet day in local gardening news", null);
    expect(c.tickers).toEqual([]);
    expect(c.entities).toEqual([]);
  });
});
