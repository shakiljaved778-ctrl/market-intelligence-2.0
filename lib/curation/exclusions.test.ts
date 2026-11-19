import { describe, expect, it } from "vitest";
import {
  checkExclusion,
  excludedTermsIn,
  isExcluded,
  loadExclusions,
} from "./exclusions";

// Headlines as they appeared on the live wire, 2026-11-19, plus close variants.
describe("exclusions — Qatar Central Bank (always)", () => {
  it.each([
    "QCB Issues the Guide on Bank Commission and Fee Ceilings Collected from Individuals and Micro-Enterprises",
    "QCB Obtains International Certificate for Information Security Management System",
    "Qatar Central Bank keeps rates unchanged after Fed decision",
    "Central Bank of Qatar issues treasury bills worth QR 1bn",
    "QCB's foreign reserves rise in October",
  ])("excludes %s from any source", (headline) => {
    expect(isExcluded({ texts: [headline] })).toBe(true);
    expect(isExcluded({ texts: [headline], sourceRegion: "US" })).toBe(true);
  });

  it("matches only whole words", () => {
    expect(isExcluded({ texts: ["QCBX index launch"] })).toBe(false);
  });

  it("catches a mention in the dek too", () => {
    expect(
      isExcluded({
        texts: [
          "Banks lift deposit rates",
          "The Qatar Central Bank said on Monday ...",
        ],
      }),
    ).toBe(true);
  });
});

describe("exclusions — Qatar politics", () => {
  it.each([
    "Sheikh Tamim attends GCC summit in Kuwait",
    "Amiri Diwan announces public holiday",
    "Qatar's Prime Minister meets US Secretary of State",
    "Qatar Condemns Attack, Reiterates Call for Ceasefire",
    "Qatari Ambassador Presents Credentials to President of Kenya",
    "Cabinet approves Qatar's draft general budget",
  ])("excludes %s", (headline) => {
    expect(isExcluded({ texts: [headline] })).toBe(true);
  });

  it("uses the source region when the headline does not name Qatar", () => {
    expect(
      isExcluded({
        texts: ["HH the Amir Receives Phone Call from President of France"],
        sourceRegion: "QA",
      }),
    ).toBe(true);
    expect(
      isExcluded({ texts: ["Shura Council approves draft law"], sourceRegion: "QA" }),
    ).toBe(true);
    const h =
      "Minister of Commerce and Industry Meets Georgia's Deputy Prime Minister, Foreign Minister";
    expect(isExcluded({ texts: [h], sourceRegion: "QA" })).toBe(true);
    expect(
      checkExclusion({
        texts: ["Minister of Finance meets IMF mission"],
        sourceRegion: "QA",
      }),
    ).toMatchObject({ excluded: true, reason: "qatar-politics: minister meets" });
  });

  it("leaves political words about other countries alone", () => {
    expect(isExcluded({ texts: ["UK Prime Minister unveils budget"] })).toBe(false);
    expect(
      isExcluded({
        texts: ["ECB President testifies before European Parliament"],
        sourceRegion: "EU",
      }),
    ).toBe(false);
  });

  it("keeps Qatar market and economy news", () => {
    for (const h of [
      "Gold Price in Qatari Market Falls by 2.05% This Week",
      "National Planning Council: Gradual Improvement in Qatar's Real GDP for Q3 2026",
      "Qatar Chamber Chairman: Artificial Intelligence Enhances Private Sector Competitiveness",
      "QNB Group net profit rises 4% in third quarter",
      "QatarEnergy signs 15-year LNG supply deal",
    ]) {
      expect(isExcluded({ texts: [h], sourceRegion: "QA" }), h).toBe(false);
    }
  });
});

describe("exclusions — AI articles", () => {
  it("lists the always-terms an article mentions", () => {
    expect(
      excludedTermsIn("Rates in the Gulf follow the Fed; the QCB usually moves too."),
    ).toEqual(["QCB"]);
    expect(excludedTermsIn("Japan's prime minister spoke on Tuesday.")).toEqual([]);
  });
});

describe("exclusions — rule file", () => {
  it("parses and is non-empty", () => {
    const r = loadExclusions();
    expect(r.always).toContain("Qatar Central Bank");
    expect(r.qatar_politics.length).toBeGreaterThan(20);
  });
});
