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
