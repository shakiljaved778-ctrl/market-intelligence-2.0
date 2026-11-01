/**
 * Per-section freshness windows (Phase 2 §6). The homepage and section fronts
 * only show stories inside their section's window, so a stale item never leads.
 * Eureka is EVERGREEN — Nobel-idea explainers are features, shown without an
 * "age ago" stamp rather than as dated news.
 *
 * Markets/Economy/Crypto: 48h · World/Tech & AI/Real Estate: 72h ·
 * Science/Health: 7 days · Eureka: evergreen · (Sports/Culture default 72h).
 */

const HOURS: Record<string, number | null> = {
  markets: 48,
  economy: 48,
  crypto: 48,
  world: 72,
  technology: 72,
  realestate: 72,
  science: 168,
  health: 168,
  eureka: null, // evergreen
  sports: 72,
  entertainment: 72,
};

const DEFAULT_WINDOW_HOURS = 72;

/** Max age in hours for a section, or null when the section is evergreen. */
export function maxAgeHours(section: string): number | null {
  if (section in HOURS) return HOURS[section] ?? null;
  return DEFAULT_WINDOW_HOURS;
}

/** True when a story is inside its section's freshness window (evergreen = always). */
export function isFresh(
  section: string,
  publishedAt: string,
  now: number = Date.now(),
): boolean {
  const hours = maxAgeHours(section);
  if (hours === null) return true; // evergreen
  const age = now - Date.parse(publishedAt);
  if (!Number.isFinite(age)) return false;
  return age >= 0 ? age <= hours * 3600 * 1000 : true; // future-dated: keep
}

/** Evergreen sections are shown as features WITHOUT an age stamp (§6). */
export function showsAgeStamp(section: string): boolean {
  return maxAgeHours(section) !== null;
}
