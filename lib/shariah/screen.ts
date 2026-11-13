/**
 * Rule-based Shariah screen (Phase 2). A PURE function of a company's reported
 * figures and a configured standard (content/shariah-standard.ts), so every
 * result can be reproduced and explained ratio by ratio.
 *
 * Outcomes:
 *  - "compliant":         the activity screen passes and every ratio is within
 *                         its limit;
 *  - "non_compliant":     the activity screen fails, or any ratio exceeds its
 *                         limit (each failing ratio is listed);
 *  - "insufficient_data": a figure needed for a ratio is missing or invalid —
 *                         we never guess a missing number.
 *
 * This is a financial screen, not a fatwa, and not investment advice.
 */
export type ScreenField =
  | "marketCap"
  | "totalAssets"
  | "totalRevenue"
  | "interestBearingDebt"
  | "interestBearingAssets"
  | "nonCompliantIncome";

export interface RatioRule {
  id: string;
  label: string;
  numerator: ScreenField;
  denominator: ScreenField;
  /** Inclusive upper limit, as a fraction (0.3 = 30%). */
  max: number;
}

export interface ScreenStandard {
  id: string;
  name: string;
  /** False until the owner confirms the standard; nothing is shown before then. */
  published: boolean;
  prohibitedActivities: string[];
  ratios: RatioRule[];
}

export interface CompanyFigures {
  symbol: string;
  /** Activity tags for the company's core business (e.g. "conventional_banking"). */
  activities: string[];
  /** Reported values in one currency; null when not reported. */
  figures: Partial<Record<ScreenField, number | null>>;
  /** Date of the financial statements the figures come from (YYYY-MM-DD). */
  dataDate: string;
  /** Where the figures come from (provider name). */
  source: string;
}

export interface RatioResult {
  id: string;
  label: string;
  value: number | null;
  max: number;
  pass: boolean | null;
}

export type ScreenStatus = "compliant" | "non_compliant" | "insufficient_data";

export interface ScreenResult {
  symbol: string;
  status: ScreenStatus;
  standardId: string;
  activityPass: boolean;
  failedActivities: string[];
  ratios: RatioResult[];
  dataDate: string;
  source: string;
}

function valid(n: number | null | undefined): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= 0;
}

export function screenCompany(
  company: CompanyFigures,
  standard: ScreenStandard,
): ScreenResult {
  const failedActivities = company.activities.filter((a) =>
    standard.prohibitedActivities.includes(a),
  );
  const activityPass = failedActivities.length === 0;

  const ratios: RatioResult[] = standard.ratios.map((rule) => {
    const num = company.figures[rule.numerator];
    const den = company.figures[rule.denominator];
    if (!valid(num) || !valid(den) || den === 0) {
      return { id: rule.id, label: rule.label, value: null, max: rule.max, pass: null };
    }
    const value = num / den;
    return {
      id: rule.id,
      label: rule.label,
      value,
      max: rule.max,
      pass: value <= rule.max,
    };
  });

  let status: ScreenStatus;
  if (!activityPass || ratios.some((r) => r.pass === false)) status = "non_compliant";
  else if (ratios.some((r) => r.pass === null)) status = "insufficient_data";
  else status = "compliant";

  return {
    symbol: company.symbol,
    status,
    standardId: standard.id,
    activityPass,
    failedActivities,
    ratios,
    dataDate: company.dataDate,
    source: company.source,
  };
}
