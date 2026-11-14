/**
 * The Shariah screening standard Mizaan applies — configuration, not code.
 *
 * STATUS: DRAFT. `published` is false, so no Shariah status is shown anywhere
 * on the site. The owner chooses the standard (implementation plan, decision
 * Q5) and should have the wording and thresholds reviewed by a qualified
 * adviser before this is switched on. The values below follow the commonly
 * cited AAOIFI Shariah Standard No. 21 financial ratios and are TO BE CONFIRMED.
 *
 * The screen is a rule-based financial screen. It is not a fatwa and not
 * investment advice; the methodology page must say so.
 */
import type { ScreenStandard } from "@/lib/shariah/screen";

export const SHARIAH_STANDARD: ScreenStandard = {
  id: "aaoifi-ss21-draft",
  name: "AAOIFI Shariah Standard No. 21 (financial ratios) — draft, to be confirmed",
  published: false,
  // Core businesses that fail the activity screen outright.
  prohibitedActivities: [
    "conventional_banking",
    "conventional_insurance",
    "alcohol",
    "pork",
    "gambling",
    "tobacco",
    "adult_entertainment",
  ],
  ratios: [
    {
      id: "interest_bearing_debt",
      label: "Interest-bearing debt / market capitalisation",
      numerator: "interestBearingDebt",
      denominator: "marketCap",
      max: 0.3,
    },
    {
      id: "interest_bearing_assets",
      label: "Interest-bearing cash and securities / market capitalisation",
      numerator: "interestBearingAssets",
      denominator: "marketCap",
      max: 0.3,
    },
    {
      id: "non_compliant_income",
      label: "Non-compliant income / total revenue",
      numerator: "nonCompliantIncome",
      denominator: "totalRevenue",
      max: 0.05,
    },
  ],
};
