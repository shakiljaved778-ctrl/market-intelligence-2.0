/**
 * Build a Pexels search query for a story's cover photo (§13). A base term per
 * section keeps covers on-theme; the story's own entity/ticker/topic is appended
 * so stories in the same section resolve to different photos. Shared by the
 * cluster job (live stories) and scripts/fetch-cover-images.ts (fixtures).
 */
export const SECTION_QUERY: Record<string, string> = {
  markets: "stock market trading",
  economy: "economy finance city",
  technology: "artificial intelligence technology",
  health: "medicine health laboratory",
  sports: "stadium sport action",
  entertainment: "cinema film culture",
  science: "space science research",
};

export function coverQuery(section: string, extra?: string | null): string {
  const base = SECTION_QUERY[section] ?? "global news";
  const tail = extra?.trim();
  return tail ? `${base} ${tail}` : base;
}

/**
 * A place a stock photo can show, for Gulf stories (§13). A Gulf story's cover
 * searches its city ("economy finance city Doha") rather than an entity name
 * the photo library does not know ("Ooredoo"), so it gets a recognisable local
 * scene instead of the drawn section cover.
 */
const GCC_PLACE: Record<string, string> = {
  QA: "Doha",
  SA: "Riyadh",
  AE: "Dubai",
  KW: "Kuwait City",
  BH: "Manama",
  OM: "Muscat",
  GCC: "Gulf city skyline",
};

export function gccPlace(region: string | null | undefined): string | null {
  return (region && GCC_PLACE[region]) ?? null;
}
