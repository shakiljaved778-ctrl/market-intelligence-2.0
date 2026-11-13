/**
 * Region tagging (Phase 2): which GCC country a story concerns, or "GCC" when it
 * concerns the Gulf as a whole, or "GLOBAL". Deterministic, like sections:
 *
 *  1. A source registered with a GCC region (content/sources.yaml `region: QA`)
 *     tags its stories with that country.
 *  2. Otherwise the headline and description are matched against the country
 *     dictionaries below. Names match case-sensitively as whole tokens, so
 *     "gulf" in "Gulf of Mexico" does not make a story Gulf news unless the
 *     phrase itself names the region (see GCC_TERMS).
 *  3. Mentions of two or more GCC countries, or of the GCC itself, give "GCC".
 */
export type GccCountry = "QA" | "SA" | "AE" | "KW" | "BH" | "OM";
export type Region = GccCountry | "GCC" | "GLOBAL";

export const GCC_COUNTRIES: readonly GccCountry[] = [
  "QA",
  "SA",
  "AE",
  "KW",
  "BH",
  "OM",
];

export const COUNTRY_TERMS: Record<GccCountry, string[]> = {
  QA: [
    "Qatar",
    "Qatari",
    "Doha",
    "QNB",
    "Qatar Central Bank",
    "QCB",
    "Qatar Stock Exchange",
    "QSE",
    "QatarEnergy",
    "Ooredoo",
    "Industries Qatar",
    "Masraf Al Rayan",
    "Qatar Islamic Bank",
    "QIA",
  ],
  SA: [
    "Saudi",
    "Saudi Arabia",
    "Riyadh",
    "Jeddah",
    "Tadawul",
    "Saudi Exchange",
    "SAMA",
    "Aramco",
    "SABIC",
    "Al Rajhi",
    "PIF",
    "NEOM",
  ],
  AE: [
    "UAE",
    "United Arab Emirates",
    "Emirati",
    "Dubai",
    "Abu Dhabi",
    "DFM",
    "ADX",
    "CBUAE",
    "ADNOC",
    "Emirates NBD",
    "First Abu Dhabi Bank",
    "Emaar",
    "Mubadala",
    "ADIA",
  ],
  KW: ["Kuwait", "Kuwaiti", "Boursa Kuwait", "KIA"],
  BH: ["Bahrain", "Bahraini", "Manama", "Bahrain Bourse"],
  OM: ["Oman", "Omani", "Muscat", "Muscat Stock Exchange"],
};

const GCC_TERMS = [
  "GCC",
  "Gulf Cooperation Council",
  "Gulf states",
  "Gulf markets",
  "Gulf economies",
];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
const cache = new Map<string, RegExp>();
function has(text: string, term: string): boolean {
  let re = cache.get(term);
  if (!re) {
    re = new RegExp(`(^|[^A-Za-z0-9])${escapeRegex(term)}([^A-Za-z0-9]|$)`);
    cache.set(term, re);
  }
  return re.test(text);
}

export function isGccCountry(code: string | null | undefined): code is GccCountry {
  return Boolean(code && (GCC_COUNTRIES as readonly string[]).includes(code));
}

export interface RegionInput {
  title: string;
  dek?: string | null;
  /** Region of the story's source (content/sources.yaml), if known. */
  sourceRegion?: string | null;
}

export function classifyRegion(input: RegionInput): Region {
  if (isGccCountry(input.sourceRegion)) return input.sourceRegion;
  if (input.sourceRegion === "GCC") return "GCC";
  const text = `${input.title} ${input.dek ?? ""}`;
  const countries = GCC_COUNTRIES.filter((c) =>
    COUNTRY_TERMS[c].some((t) => has(text, t)),
  );
  if (countries.length >= 2 || GCC_TERMS.some((t) => has(text, t))) return "GCC";
  return countries[0] ?? "GLOBAL";
}

export function isGccRegion(region: Region | string | null | undefined): boolean {
  return region === "GCC" || isGccCountry(region);
}

const LABELS: Record<Region, string> = {
  QA: "Qatar",
  SA: "Saudi Arabia",
  AE: "UAE",
  KW: "Kuwait",
  BH: "Bahrain",
  OM: "Oman",
  GCC: "GCC",
  GLOBAL: "Global",
};

export function regionLabel(region: Region): string {
  return LABELS[region];
}
