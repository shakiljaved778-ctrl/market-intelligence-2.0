import { describe, expect, it } from "vitest";
import {
  evaluateQuality,
  hasSpecificEntity,
  isInstitutionalTitle,
  numbersIn,
} from "./quality";

describe("hasSpecificEntity", () => {
  it("rejects seed-style generic headlines (no entity, no number)", () => {
    expect(
      hasSpecificEntity("Voters head to the polls in a pivotal national election"),
    ).toBe(false);
    expect(
      hasSpecificEntity("Historic peace deal signed to end a regional conflict"),
    ).toBe(false);
    expect(hasSpecificEntity("Leaders gather for a major diplomatic summit")).toBe(
      false,
    );
  });

  it("accepts headlines that name a number, ticker/entity or proper noun", () => {
    expect(hasSpecificEntity("Fed holds rates at 4.5%")).toBe(true); // number
    expect(hasSpecificEntity("Apple beats on earnings as iPhone sales rebound")).toBe(
      true,
    ); // ticker/entity
    expect(hasSpecificEntity("G20 leaders meet in Doha")).toBe(true); // number + proper noun
    expect(hasSpecificEntity("OpenAI launches a faster model")).toBe(true); // proper noun
  });
});

describe("isInstitutionalTitle", () => {
  it("flags raw document-style titles", () => {
    expect(
      isInstitutionalTitle(
        "Minutes of the Meeting of the Court of Directors held on 17 September 2026",
      ),
    ).toBe(true);
    expect(isInstitutionalTitle("Monetary policy decisions")).toBe(true);
    expect(isInstitutionalTitle("Federal Reserve issues FOMC statement")).toBe(true);
  });
  it("leaves factual headlines alone", () => {
    expect(isInstitutionalTitle("Fed holds rates at 4.5%, signals patience")).toBe(
      false,
    );
  });
});

describe("numbersIn", () => {
  it("extracts and normalises numeric tokens", () => {
    expect(numbersIn("GDP rose 2.5% to $1,200 from 3")).toEqual(["2.5", "1200", "3"]);
  });
});

describe("evaluateQuality", () => {
  it("passes a specific headline with a well-sourced summary", () => {
    const r = evaluateQuality({
      headline: "Fed holds rates at 4.5%",
      summary:
        "The Federal Reserve left its benchmark policy rate unchanged at 4.5%, repeating that it will stay data-dependent while it waits for more evidence that inflation is easing durably toward its 2% target, and officials were careful not to pre-commit to the timing or pace of any future interest-rate cuts.",
      sources: ["FOMC holds at 4.5%, cites 2% inflation goal"],
    });
    expect(r.ok).toBe(true);
    expect(r.reasons).toEqual([]);
  });

  it("fails a generic headline", () => {
    const r = evaluateQuality({
      headline: "Leaders gather for a major diplomatic summit",
    });
    expect(r.ok).toBe(false);
    expect(r.reasons).toContain("headline_lacks_specific_entity");
  });

  it("fails a too-short summary and flags unsupported numbers", () => {
    const r = evaluateQuality({
      headline: "Acme reports results",
      summary: "Acme rose 40% today, far above the 5% its rivals managed.",
      sources: ["Acme shares rose 40% after earnings"], // 5% is not in any source
    });
    expect(r.ok).toBe(false);
    expect(r.reasons).toContain("summary_too_short");
    expect(r.reasons.some((x) => x.startsWith("unsupported_numbers"))).toBe(true);
  });

  it("flags an institutional title for rewrite without hard-failing on the entity check", () => {
    const r = evaluateQuality({ headline: "Monetary policy decisions" });
    expect(r.needsRewrite).toBe(true);
    expect(r.reasons).not.toContain("headline_lacks_specific_entity");
  });
});

describe("brief §4.6 filters (2026-11-28)", () => {
  it("drops sponsored items, even with an otherwise good headline", () => {
    const r = evaluateQuality({
      headline: "Sponsored: Qatar Airways launches new Doha–Lisbon route",
    });
    expect(r.ok).toBe(false);
    expect(r.reasons).toContain("sponsored");
    const viaDek = evaluateQuality({
      headline: "Five ways Apple Pay is changing GCC retail",
      dek: "In partnership with a payments provider.",
    });
    expect(viaDek.reasons).toContain("sponsored");
  });

  it("drops headlines under four words from outlets, not from official sources", () => {
    expect(
      evaluateQuality({ headline: "Apple slips", tier: "outlet" }).reasons,
    ).toContain("headline_too_short");
    expect(
      evaluateQuality({ headline: "Advance Retail Inventories", tier: "primary" })
        .reasons,
    ).not.toContain("headline_too_short");
    expect(
      evaluateQuality({ headline: "Statistical Notice", tier: "regulator" }).reasons,
    ).not.toContain("headline_too_short");
  });

  it("keeps a normal specific headline", () => {
    expect(
      evaluateQuality({
        headline: "QatarEnergy signs LNG supply deal with Sinopec",
        tier: "wire",
      }).ok,
    ).toBe(true);
  });
});
