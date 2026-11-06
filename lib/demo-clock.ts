import { FIXTURE_ARTICLES } from "@/fixtures/articles";

/**
 * Demo clock for the zero-key fixture wire (§2).
 *
 * The fixture articles carry fixed authored dates (Sept–Oct 2026) so the build,
 * the tests and the clustering demo are reproducible. But a frozen wire makes
 * the live demo look stale — the "Today on Mizaan" ticker shows a past date and
 * every story reads as days old. To keep the zero-key demo current WITHOUT
 * touching any authored timestamp, we shift the whole fixture wire forward by a
 * whole number of days so the NEWEST story lands on today.
 *
 * The offset is anchored to UTC midnight, so it changes only once per UTC day:
 * within a day the shifted timestamps — and therefore the ranking clock, the
 * relative labels and the recap dates — are fully deterministic. The shift is
 * uniform, so relative recency between stories (and thus ranking order, cluster
 * slugs and the editorial mix) is unchanged. Live (DB) stories carry real dates
 * and are never shifted — this applies to the fixture path only.
 */
const DAY_MS = 86_400_000;

const toMidnight = (ms: number) => Math.floor(ms / DAY_MS) * DAY_MS;

/** The newest authored fixture timestamp (the wire's demo anchor). */
const NEWEST_FIXTURE_MS = Math.max(
  ...FIXTURE_ARTICLES.map((a) => new Date(a.publishedAt).getTime()),
);

/** Whole-day offset (UTC-midnight anchored) that maps the newest fixture onto today. */
export function demoOffsetMs(nowMs: number = Date.now()): number {
  return toMidnight(nowMs) - toMidnight(NEWEST_FIXTURE_MS);
}

/** Shift one fixture ISO timestamp forward onto the current demo window. */
export function shiftFixtureDate(iso: string, nowMs: number = Date.now()): string {
  return new Date(new Date(iso).getTime() + demoOffsetMs(nowMs)).toISOString();
}

/**
 * The demo "now" used to rank the fixture wire — pinned just after the shifted
 * newest story, so the most recently dated batch always leads (older stories age
 * down to the recency floor, exactly like a live wire).
 */
export function demoNow(nowMs: number = Date.now()): Date {
  return new Date(NEWEST_FIXTURE_MS + demoOffsetMs(nowMs) + 60 * 60 * 1000);
}
