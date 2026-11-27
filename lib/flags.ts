/**
 * Feature flags (pre-launch brief §1.6, 2026-11-27). New features ship OFF and
 * are switched on per environment, with no code change, by setting the
 * variable to "1" or "true" in Vercel (then redeploying, as for any variable).
 *
 * Read on the server only. Each variable is read with a literal name so the
 * value is also correct if a flag is ever read in a client bundle.
 */
export type FlagName = "deals" | "navV2" | "gccPegs";

function on(value: string | undefined): boolean {
  return value === "1" || value === "true";
}

export function flag(name: FlagName): boolean {
  switch (name) {
    case "deals":
      // Private Equity, Investment Banking and Venture Capital sections + /deals.
      return on(process.env.NEXT_PUBLIC_FLAG_DEALS);
    case "navV2":
      // Markets · Wire · Economy · Deals · Tech & AI · GCC · Sports · More.
      return on(process.env.NEXT_PUBLIC_FLAG_NAV_V2);
    case "gccPegs":
      // GCC currency pegs reference card on /markets.
      return on(process.env.NEXT_PUBLIC_FLAG_GCC_PEGS);
  }
}
