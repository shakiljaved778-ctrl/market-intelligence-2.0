import { beforeEach, describe, expect, it } from "vitest";
import { readSectionSummaries } from "@/lib/news/read";
import { __resetSectionCache, classifySection, isFinancialSection } from "./section";

describe("section classifier (deterministic, dictionary-driven)", () => {
  beforeEach(() => __resetSectionCache());

  it("routes a genuine tech/AI story to technology", () => {
    expect(
      classifySection({
        title: "OpenAI unveils new AI model with major reasoning gains",
        dek: "The latest artificial intelligence model improves reasoning.",
      }),
    ).toBe("technology");
  });

  it("routes sport, health, culture and science stories to their verticals", () => {
    expect(classifySection({ title: "FIFA confirms expanded World Cup format" })).toBe(
      "sports",
    );
    expect(
      classifySection({ title: "WHO issues new guidance on dengue outbreaks" }),
    ).toBe("health");
    expect(classifySection({ title: "Sci-fi epic tops the global box office" })).toBe(
      "entertainment",
    );
    expect(classifySection({ title: "NASA telescope captures a distant galaxy" })).toBe(
      "science",
    );
    expect(
      classifySection({
        title: "John Nash and the equilibrium that reshaped economics",
        dek: "The mathematician shared the 1994 Nobel in economics for the Nash equilibrium.",
      }),
    ).toBe("eureka");
  });

  it("routes macro topics to economy and instrument news to markets", () => {
    expect(
      classifySection({
        title: "US inflation cools to slowest pace in three years",
        topics: ["inflation"],
      }),
    ).toBe("economy");
    expect(
      classifySection({
        title: "Tesla shares slide after it trims delivery outlook",
        topics: ["earnings"],
        tickers: ["TSLA"],
      }),
    ).toBe("markets");
  });

  it("defaults to markets when nothing matches", () => {
    expect(classifySection({ title: "A quiet, uneventful trading day" })).toBe(
      "markets",
    );
  });

  it("knows which sections are financial", () => {
    expect(isFinancialSection("markets")).toBe(true);
    expect(isFinancialSection("economy")).toBe(true);
    expect(isFinancialSection("technology")).toBe(false);
    expect(isFinancialSection("sports")).toBe(false);
  });
});

describe("section classifier — 20 labelled cases (Phase 2 §5)", () => {
  beforeEach(() => __resetSectionCache());

  type Case = {
    title: string;
    dek?: string;
    topics?: string[];
    tickers?: string[];
    expected: string;
  };

  const CASES: Case[] = [
    // Equity indices / earnings / stock moves → markets (incl. the cited FTSE bug).
    {
      title: "FTSE 100 climbs to a record on strong UK company results",
      expected: "markets",
    },
    {
      title: "Apple beats on earnings as iPhone sales rebound",
      topics: ["earnings"],
      tickers: ["AAPL"],
      expected: "markets",
    },
    {
      title: "Gold sets a record as investors hedge against uncertainty",
      expected: "markets",
    },
    { title: "OPEC+ agrees to hold oil output steady", expected: "markets" },
    { title: "Nikkei 225 rallies to a multi-decade high", expected: "markets" },
    // Space agencies → science (the cited NASA-under-Tech bug).
    {
      title: "NASA resupply mission launches to the space station",
      expected: "science",
    },
    {
      title: "A satellite deployment expands global broadband coverage",
      expected: "science",
    },
    {
      title: "Astronomers map a distant asteroid in unprecedented detail",
      expected: "science",
    },
    {
      title: "Scientists sequence the genome of an extinct species",
      expected: "science",
    },
    // Tech & AI only for tech companies / AI / digital products.
    {
      title: "OpenAI launches a faster AI model with better reasoning",
      expected: "technology",
    },
    { title: "Nvidia unveils its next-generation AI chip", expected: "technology" },
    // Macro → economy.
    {
      title: "US CPI cools to a three-year low",
      topics: ["inflation"],
      expected: "economy",
    },
    {
      title: "Fed holds interest rates steady, signals patience on cuts",
      topics: ["monetary_policy"],
      expected: "economy",
    },
    // Crypto, real estate.
    {
      title: "Regulators clear first options on spot bitcoin ETFs",
      expected: "crypto",
    },
    {
      title: "Qatar home prices rise as mortgage demand firms",
      expected: "realestate",
    },
    // Non-financial verticals.
    { title: "WHO warns of a new measles outbreak in the region", expected: "health" },
    { title: "Manchester United advance in the Champions League", expected: "sports" },
    {
      title: "A new Marvel film tops the global box office",
      expected: "entertainment",
    },
    {
      title: "Nobel Prize in Physics awarded for quantum research",
      dek: "The laureate was honoured for foundational work.",
      expected: "eureka",
    },
    { title: "G20 leaders meet for a diplomatic summit on trade", expected: "world" },
  ];

  it("has 20 cases", () => expect(CASES).toHaveLength(20));

  for (const c of CASES) {
    it(`"${c.title}" → ${c.expected}`, () => {
      expect(
        classifySection({
          title: c.title,
          dek: c.dek ?? null,
          topics: c.topics,
          tickers: c.tickers,
        }),
      ).toBe(c.expected);
    });
  }
});

describe("editorial mix (§13 product rule)", () => {
  beforeEach(() => __resetSectionCache());

  it("keeps at least ~30% of the live wire non-financial", async () => {
    const { nonFinancialPct, total, nonFinancial } = await readSectionSummaries();
    expect(total).toBeGreaterThan(0);
    expect(nonFinancial).toBeGreaterThan(0);
    // Markets-first, but a deliberate non-financial share for engagement.
    expect(nonFinancialPct).toBeGreaterThanOrEqual(30);
    // ...and still markets-first: non-financial is a minority of the wire.
    expect(nonFinancialPct).toBeLessThan(50);
  });
});
