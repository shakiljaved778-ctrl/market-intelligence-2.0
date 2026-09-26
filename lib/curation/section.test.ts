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
