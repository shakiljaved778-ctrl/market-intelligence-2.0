import { describe, expect, it } from "vitest";
import { SHARIAH_STANDARD } from "@/content/shariah-standard";
import { screenCompany, type CompanyFigures } from "./screen";

function company(over: Partial<CompanyFigures> = {}): CompanyFigures {
  return {
    symbol: "TEST",
    activities: ["telecommunications"],
    figures: {
      marketCap: 1000,
      totalRevenue: 200,
      interestBearingDebt: 250, // 25%
      interestBearingAssets: 100, // 10%
      nonCompliantIncome: 4, // 2%
    },
    dataDate: "2026-06-30",
    source: "test",
    ...over,
  };
}

describe("screenCompany (rule-based Shariah screen)", () => {
  it("is not published until the owner confirms the standard", () => {
    expect(SHARIAH_STANDARD.published).toBe(false);
  });

  it("passes a company within every limit and explains each ratio", () => {
    const r = screenCompany(company(), SHARIAH_STANDARD);
    expect(r.status).toBe("compliant");
    expect(r.ratios.map((x) => x.value)).toEqual([0.25, 0.1, 0.02]);
    expect(r.ratios.every((x) => x.pass)).toBe(true);
    expect(r.dataDate).toBe("2026-06-30");
  });

  it("treats the limit as inclusive", () => {
    const r = screenCompany(
      company({ figures: { ...company().figures, interestBearingDebt: 300 } }),
      SHARIAH_STANDARD,
    );
    expect(r.ratios[0]?.value).toBe(0.3);
    expect(r.status).toBe("compliant");
  });

  it("fails a company over a limit and names the failing ratio", () => {
    const r = screenCompany(
      company({ figures: { ...company().figures, interestBearingDebt: 301 } }),
      SHARIAH_STANDARD,
    );
    expect(r.status).toBe("non_compliant");
    expect(r.ratios.filter((x) => x.pass === false).map((x) => x.id)).toEqual([
      "interest_bearing_debt",
    ]);
  });

  it("fails a prohibited core business whatever its ratios", () => {
    const r = screenCompany(
      company({ activities: ["conventional_banking"] }),
      SHARIAH_STANDARD,
    );
    expect(r.status).toBe("non_compliant");
    expect(r.activityPass).toBe(false);
    expect(r.failedActivities).toEqual(["conventional_banking"]);
  });

  it("never guesses a missing figure", () => {
    const r = screenCompany(
      company({ figures: { ...company().figures, nonCompliantIncome: null } }),
      SHARIAH_STANDARD,
    );
    expect(r.status).toBe("insufficient_data");
    expect(r.ratios[2]).toMatchObject({ value: null, pass: null });
  });

  it("reports non-compliance even when another figure is missing", () => {
    const r = screenCompany(
      company({
        figures: { ...company().figures, interestBearingDebt: 900, totalRevenue: null },
      }),
      SHARIAH_STANDARD,
    );
    expect(r.status).toBe("non_compliant");
  });

  it("rejects a zero or negative denominator as missing data", () => {
    const r = screenCompany(
      company({ figures: { ...company().figures, marketCap: 0 } }),
      SHARIAH_STANDARD,
    );
    expect(r.status).toBe("insufficient_data");
  });
});
