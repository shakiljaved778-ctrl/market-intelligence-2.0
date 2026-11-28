import type { WireCluster } from "./read";

/**
 * Section freshness SLO (brief §4.5, 2026-11-28): a section front should show
 * at least SECTION_FRESH_MIN stories under SECTION_FRESH_HOURS old. When it
 * cannot, the page says so with a "More from …" row of fresh stories from the
 * nearest related section, instead of padding the list with old ones.
 */
export const SECTION_FRESH_MIN = 6;
export const SECTION_FRESH_HOURS = 72;
export const SECTION_FILL_SIZE = 6;

const RELATED: Record<string, string> = {
  markets: "economy",
  economy: "markets",
  crypto: "markets",
  realestate: "economy",
  privateequity: "markets",
  ibanking: "markets",
  venture: "technology",
  technology: "science",
  science: "technology",
  health: "science",
  world: "economy",
};

/** PURE: the section whose stories fill a thin one ("World" by default). */
export function relatedSection(id: string): string {
  return RELATED[id] ?? "world";
}

const fresh = (c: WireCluster, now: number) => {
  const t = Date.parse(c.eventTime);
  return Number.isFinite(t) && now - t <= SECTION_FRESH_HOURS * 3_600_000;
};

/**
 * PURE: the fill row for `section`, or null when the section meets its SLO.
 * `wire` is the whole ranked wire; stories already on the page are skipped.
 */
export function sectionFill(
  section: string,
  wire: WireCluster[],
  now: number = Date.now(),
): { section: string; stories: WireCluster[] } | null {
  const own = wire.filter((c) => c.section === section && fresh(c, now));
  if (own.length >= SECTION_FRESH_MIN) return null;
  const target = relatedSection(section);
  const stories = wire
    .filter((c) => c.section === target && fresh(c, now))
    .slice(0, SECTION_FILL_SIZE);
  return stories.length > 0 ? { section: target, stories } : null;
}
