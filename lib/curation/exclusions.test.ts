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

// Real QNA economy-feed headlines from the probe of 2026-11-19 (run 44474647669).
describe("exclusions — Gulf business news is kept, government and diplomacy is not", () => {
  it.each([
    "Downtown Tech 2026 Brings Entrepreneurs and Investors Together to Discuss Building Global Companies",
    "Qatar Chamber Discusses Partnership, Investment Opportunities With Romania",
    "QICCA, Beijing Financial Court Discuss Boosting Cooperation",
    "Gulf Helicopters Company Unveils New Corporate Identity",
    "Italy Regains Investor Confidence as Economic Fundamentals Improve, QNB Says",
    "MEEZA Signs More than QR100 Million Sovereign Cloud Deal",
    "Qatar Stock Exchange: Dandy’s Listing Opens New Investment Opportunities in Consumer Goods and Services Sector",
    "State Budget Posts QAR 22.8 Billion Deficit in Q3 2026",
  ])("keeps %s", (headline) => {
    expect(isExcluded({ texts: [headline], sourceRegion: "QA" })).toBe(false);
  });

  it.each([
    "Minister of Commerce and Industry Meets Georgia's Deputy Prime Minister, Foreign Minister",
    "Romania Seeks to Expand Investment and Ties with Qatar, Says Minister",
    "Qatar Participates in 20th Francophonie Summit",
    "Interior Ministry: New Traffic Law Enhances Road Safety",
    "Minister of Finance Receives Visiting Official Delegation",
  ])("excludes %s", (headline) => {
    expect(isExcluded({ texts: [headline], sourceRegion: "QA" })).toBe(true);
  });

  it("needs the text to name Qatar before a general political word excludes", () => {
    expect(
      isExcluded({
        texts: ["Oil heads for weekly loss as geopolitical risk eases"],
        sourceRegion: "QA",
      }),
    ).toBe(false);
    expect(isExcluded({ texts: ["Qatar's political calendar for 2027"] })).toBe(true);
  });
});

describe("exclusions — a news-agency dateline does not make a story about Qatar", () => {
  const dek = (body: string) => `Doha, November 18 (QNA) - ${body}`;
  it("keeps business copy whose only Qatar mention is the dateline", () => {
    expect(
      isExcluded({
        texts: [
          "Italy Regains Investor Confidence as Economic Fundamentals Improve, QNB Says",
          dek("QNB said Italy's political stability had improved investor confidence."),
        ],
        sourceRegion: "QA",
      }),
    ).toBe(false);
    expect(
      isExcluded({
        texts: [
          "Downtown Tech 2026 Brings Entrepreneurs and Investors Together",
          dek("The summit gathered founders and investors from 40 countries."),
        ],
        sourceRegion: "QA",
      }),
    ).toBe(false);
  });

  it("still excludes when the story itself names Qatar", () => {
    expect(
      isExcluded({
        texts: [
          "Qatar Participates in 20th Francophonie Summit",
          dek("The delegation attended."),
        ],
        sourceRegion: "QA",
      }),
    ).toBe(true);
    expect(
      isExcluded({
        texts: [
          "Qatar Armed Forces Conclude 5-Kilometer Cross-Country Championship",
          dek("The race took place on Tuesday."),
        ],
        sourceRegion: "QA",
      }),
    ).toBe(true);
  });

  it("government and diplomacy terms still apply to QNA copy", () => {
    expect(
      isExcluded({
        texts: [
          "HH the Amir Receives Phone Call",
          dek("HH the Amir received a phone call."),
        ],
        sourceRegion: "QA",
      }),
    ).toBe(true);
  });
});
