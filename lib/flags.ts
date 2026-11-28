/**
 * Feature flags (pre-launch brief §1.6, 2026-11-27). New features ship OFF and
 * are switched on per environment, with no code change, by setting the
 * variable to "1" or "true" in Vercel (then redeploying, as for any variable).
 *
 * Read on the server only. Each variable is read with a literal name so the
 * value is also correct if a flag is ever read in a client bundle.
 */
export type FlagName = "deals" | "navV2" | "gccPegs" | "calendar" | "chartOfDay";

function on(value: string | undefined): boolean {
  return value === "1" || value === "true";
}

/** For a flag the owner has switched on (on unless set to "0" or "false"). */
function onUnlessOff(value: string | undefined): boolean {
  return value !== "0" && value !== "false";
}

export function flag(name: FlagName): boolean {
  switch (name) {
    case "deals":
      // Private Equity, Investment Banking and Venture Capital sections + /deals.
      // ON by default since 2026-11-28 (owner: "private equity, investment
      // banking, IPO and venture capital sections are missing"); "0" turns it off.
      return onUnlessOff(process.env.NEXT_PUBLIC_FLAG_DEALS);
    case "navV2":
      // Markets · Wire · Economy · Deals · Tech & AI · GCC · Sports · More.
      // ON by default since 2026-11-28 with Deals, so the sections are in the
      // header; "0" turns it off.
      return onUnlessOff(process.env.NEXT_PUBLIC_FLAG_NAV_V2);
    case "gccPegs":
      // GCC currency pegs reference card on /markets.
      return on(process.env.NEXT_PUBLIC_FLAG_GCC_PEGS);
    case "calendar":
      // Earnings and IPO calendar page (/calendar), from Finnhub.
      return on(process.env.NEXT_PUBLIC_FLAG_CALENDAR);
    case "chartOfDay":
      // "Chart of the Day" card at the top of /economy.
      return on(process.env.NEXT_PUBLIC_FLAG_CHART_OF_DAY);
  }
}
