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

  it("files an unplaceable story under the hidden General bucket, never Markets", () => {
    expect(classifySection({ title: "A quiet, uneventful afternoon" })).toBe("general");
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

describe("editorial mix (owner rule, 2026-11-12)", () => {
  beforeEach(() => __resetSectionCache());

  // The old rule required at least 30% of the wire to be non-financial, which
  // pushed the wrong way. Markets and economy now lead; non-finance sections are
  // capped on the homepage (lib/news/homepage.ts, tested there).
  it("reports the financial / non-financial split of the wire", async () => {
    const { nonFinancialPct, total, nonFinancial } = await readSectionSummaries();
    expect(total).toBeGreaterThan(0);
    expect(nonFinancial).toBeLessThanOrEqual(total);
    expect(nonFinancialPct).toBeGreaterThanOrEqual(0);
    expect(nonFinancialPct).toBeLessThanOrEqual(100);
  });
});

/**
 * Phase 2 regressions: the live headlines the 12 Nov audit found misfiled. A
 * NASA story must never land in Markets, Economy or Health, and the acronym WHO
 * must not match the word "who".
 */
describe("section classifier — misfiled NASA stories (Phase 2)", () => {
  beforeEach(() => __resetSectionCache());

  const NASA: { title: string; dek: string }[] = [
    {
      title: "NASA’s ESCAPADE Completes Powered Earth Flybys, Now En Route to Mars",
      dek: "NASA’s two ESCAPADE spacecraft have each completed a powered Earth flyby, using Earth’s gravity to slingshot themselves toward Mars.",
    },
    {
      title: "NASA Names Astronaut Christina Koch Acting Deputy Chief Engineer",
      dek: "NASA engineer and astronaut Christina Koch will serve as the agency’s acting deputy chief engineer, following the retirement of Katherine Van Hooser, who will conclude more than 35 years of service.",
    },
    {
      title: "NASA’s SpaceX CRS-35 Mission to Launch Health Research",
      dek: "The resupply mission carries experiments on human health in space to the International Space Station.",
    },
    {
      title: "CHAPEA Crew Leaves a Mark",
      dek: "The crew of NASA’s yearlong simulated Mars mission reflects on what the habitat taught researchers about health and performance.",
    },
    {
      title: "Newest Sample, Oldest Rock?",
      dek: "Perseverance collected a rock core that may be among the oldest material sampled on Mars.",
    },
    {
      title:
        "Johnson Space Center Sparks Curiosity at Houston’s 33rd Annual Japan Festival",
      dek: "NASA’s Johnson Space Center brought space exploration to the festival at Hermann Park.",
    },
    {
      title: "Reliable Robots: Meet Johnson’s Dexterous Robotics Team",
      dek: "Human-robot collaboration could become reality as NASA launches complex missions deeper into space.",
    },
  ];

  it("never files a NASA story under Markets, Economy or Health", () => {
    for (const s of NASA) {
      const section = classifySection({ ...s, sourceId: "nasa-news" });
      expect(["markets", "economy", "health"], s.title).not.toContain(section);
      expect(["science", "technology"], s.title).toContain(section);
    }
  });

  it("keeps a NASA feed in its allowed sections even when tickers or topics appear", () => {
    const section = classifySection({
      title: "NASA awards launch services contract",
      dek: "The agency selected a provider for an upcoming science mission.",
      tickers: ["BA"],
      topics: ["earnings"],
      sourceId: "nasa-news",
    });
    expect(section).toBe("science");
  });

  it("does not read the word 'who' as the WHO", () => {
    expect(
      classifySection({
        title: "Engineer who led the rover team retires",
        dek: "Colleagues praised a career who spanned three Mars missions.",
      }),
    ).not.toBe("health");
    expect(classifySection({ title: "WHO declares the mpox emergency over" })).toBe(
      "health",
    );
  });

  it("files an unplaceable story under the hidden General bucket", () => {
    expect(classifySection({ title: "Newest Sample, Oldest Rock?" })).toBe("general");
  });

  it("lets a single-subject feed fall back to its default section", () => {
    expect(
      classifySection({
        title: "Agency marks anniversary of first flight",
        sourceId: "nasa-news",
      }),
    ).toBe("science");
  });
});
