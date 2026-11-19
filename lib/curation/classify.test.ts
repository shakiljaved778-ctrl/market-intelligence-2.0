import { classifySection } from "./section";
import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetClassifyCache,
  classify,
  mentionsExact,
  mentionsTicker,
} from "./classify";

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

  // Regression: the live wire showed NOW, LOW, DEC, SOL, DE and AXP tags on NASA
  // and central-bank stories, because a bare symbol matched any word.
  it("does not turn ordinary words into tickers", () => {
    const cases = [
      "NASA's ESCAPADE Completes Powered Earth Flybys, Now En Route to Mars",
      "NASA Names Astronaut Christina Koch Acting Deputy Chief Engineer",
      "Minutes of the SONIA Stakeholder Advisory Group - 25 September 2026",
      "Low Earth orbit study to begin in Dec, agency says",
      "Rapport de la Banque de France sur la stabilité",
      "Sol 4500: rover drives on as dust storm clears",
    ];
    for (const headline of cases) {
      expect(classify(headline, null).tickers, headline).toEqual([]);
    }
  });

  it("matches a bare symbol only in market context", () => {
    expect(classify("ServiceNow ($NOW) raises guidance", null).tickers).toContain(
      "NOW",
    );
    expect(classify("Lowe's (NYSE: LOW) beats estimates", null).tickers).toContain(
      "LOW",
    );
    expect(classify("Shares of Deere (DE) fell", null).tickers).toContain("DE");
    expect(mentionsTicker("Buy NOW pay later", "NOW")).toBe(false);
  });

  it("matches company names case-sensitively", () => {
    expect(mentionsExact("Apple unveils a new phone", "Apple")).toBe(true);
    expect(mentionsExact("An apple a day", "Apple")).toBe(false);
    expect(classify("Record apple harvest in Washington state", null).tickers).toEqual(
      [],
    );
  });
});

describe("classify — deal and IPO topics (2026-11-19)", () => {
  it.each([
    "Lulu Retail sets price range for Abu Dhabi IPO",
    "Private equity firm agrees buyout of software maker",
    "Bank agrees takeover of regional rival",
    "Why private credit is worrying regulators",
  ])("files %s under Markets", (headline) => {
    const c = classify(headline, null);
    expect(
      classifySection({
        title: headline,
        dek: null,
        topics: c.topics,
        tickers: c.tickers,
        sourceId: "the-conversation",
      }),
    ).toBe("markets");
  });

  it.each([
    ["Lulu Retail sets price range for Abu Dhabi IPO", "ipo"],
    ["Chipmaker shares jump 40% in Nasdaq trading debut", "ipo"],
    ["Company files for initial public offering on the NYSE", "ipo"],
    ["Private equity firm agrees buyout of software maker", "private_equity"],
    ["Venture capital funding for AI startups hits record", "private_equity"],
    ["Bank agrees takeover of regional rival", "mergers"],
  ])("tags %s with %s", (headline, topic) => {
    expect(classify(headline, null).topics).toContain(topic);
  });

  it("does not treat a trade or supply deal as M&A", () => {
    expect(
      classify("QatarEnergy signs 15-year LNG supply deal", null).topics,
    ).not.toContain("mergers");
    expect(classify("EU and India close in on trade deal", null).topics).not.toContain(
      "mergers",
    );
  });
});
