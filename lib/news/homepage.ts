import { maxAgeHours } from "@/lib/curation/freshness";
import {
  isFinancialSection,
  visibleSections,
  type SectionConfig,
} from "@/lib/curation/section";
import { isGccRegion } from "@/lib/curation/region";
import type { WireCluster } from "@/lib/news/read";

/**
 * Homepage selection (Phase 2). A PURE function from the ranked wire to the
 * slots on the page, so the editorial rules are explicit and tested:
 *
 *  1. Every story appears ONCE on the homepage.
 *  2. Nothing older than TOP_SLOT_MAX_AGE_H holds a top slot (lead, hero rail,
 *     three-up row). An editor's pick obeys the same limit.
 *  3. Markets and economy LEAD, GCC first: the lead and the hero rail are
 *     filled from GCC financial stories, then other financial stories, falling
 *     back to other sections only when there are not enough fresh ones.
 *  4. Section blocks only show stories inside that section's freshness window
 *     (lib/curation/freshness.ts; Eureka is evergreen). Financial sections show
 *     up to FINANCIAL_BLOCK_SIZE stories; every other section ONE row of at most
 *     NON_FINANCIAL_ROW_SIZE.
 *  5. The "Latest" rail lists only fresh stories not already shown.
 *  6. GCC market news opens the page (owner request, 2026-11-14): a band of up
 *     to GCC_BAND_SIZE fresh GCC stories from the financial sections, newest
 *     first, above the lead. It is omitted when there are none.
 */
export const TOP_SLOT_MAX_AGE_H = 72;
export const HERO_SIDE_SIZE = 3;
export const THREE_UP_SIZE = 3;
export const FINANCIAL_BLOCK_SIZE = 5;
export const NON_FINANCIAL_ROW_SIZE = 3;
export const LATEST_SIZE = 8;
export const GCC_BAND_SIZE = 4;

export interface HomepageBlock {
  section: SectionConfig;
  stories: WireCluster[];
  /** True for non-financial sections, rendered as a single row. */
  row: boolean;
}

export interface HomepageLayout {
  /** GCC market news shown at the top of the page, newest first. */
  gcc: WireCluster[];
  lead: WireCluster | null;
  /** Set when the lead is an editor's pick. */
  leadLabel: string | null;
  heroSide: WireCluster[];
  threeUp: WireCluster[];
  blocks: HomepageBlock[];
  latest: WireCluster[];
}

const HOUR_MS = 3_600_000;

function ageHours(c: WireCluster, now: number): number {
  const t = Date.parse(c.eventTime);
  return Number.isFinite(t) ? Math.max(0, (now - t) / HOUR_MS) : Infinity;
}

export function buildHomepage(
  ranked: WireCluster[],
  opts: {
    now?: number;
    featured?: { cluster: WireCluster; label: string } | null;
  } = {},
): HomepageLayout {
  const now = opts.now ?? Date.now();
  const visible = new Set(visibleSections().map((s) => s.id));
  const used = new Set<string>();
  const take = (c: WireCluster) => {
    used.add(c.slug);
    return c;
  };

  const shown = ranked.filter((c) => visible.has(c.section));
  const topPool = shown.filter(
    (c) => c.section !== "eureka" && ageHours(c, now) <= TOP_SLOT_MAX_AGE_H,
  );
  // GCC financial stories first, then other financial, then the rest — each
  // group keeps its importance order.
  const fin = topPool.filter((c) => isFinancialSection(c.section));
  const nonFin = topPool.filter((c) => !isFinancialSection(c.section));
  const financialFirst = [
    ...fin.filter((c) => isGccRegion(c.region)),
    ...fin.filter((c) => !isGccRegion(c.region)),
    ...nonFin.filter((c) => isGccRegion(c.region)),
    ...nonFin.filter((c) => !isGccRegion(c.region)),
  ];

  // An editor's pick (when current) keeps the lead slot, so it is not also
  // repeated in the GCC band.
  const pick =
    opts.featured && ageHours(opts.featured.cluster, now) <= TOP_SLOT_MAX_AGE_H
      ? opts.featured
      : null;
  if (pick) used.add(pick.cluster.slug);

  // GCC market band: the newest fresh GCC stories from the financial sections.
  const gcc = fin
    .filter((c) => isGccRegion(c.region) && !used.has(c.slug))
    .sort((a, b) => Date.parse(b.eventTime) - Date.parse(a.eventTime))
    .slice(0, GCC_BAND_SIZE)
    .map(take);

  // Lead: a current editor's pick, else the strongest fresh financial story not
  // already in the band.
  const leadStory =
    pick?.cluster ?? financialFirst.find((c) => !used.has(c.slug)) ?? null;
  const lead = leadStory ? take(leadStory) : null;

  const heroSide = financialFirst
    .filter((c) => !used.has(c.slug))
    .slice(0, HERO_SIDE_SIZE)
    .map(take);
  // The three-up row is the next strongest fresh stories from any section.
  const threeUp = topPool
    .filter((c) => !used.has(c.slug))
    .slice(0, THREE_UP_SIZE)
    .map(take);

  const blocks: HomepageBlock[] = [];
  const sections = visibleSections();
  const ordered = [
    ...sections.filter((s) => s.financial),
    ...sections.filter((s) => !s.financial),
  ];
  for (const section of ordered) {
    const window = maxAgeHours(section.id);
    const size = section.financial ? FINANCIAL_BLOCK_SIZE : NON_FINANCIAL_ROW_SIZE;
    const stories = shown
      .filter(
        (c) =>
          c.section === section.id &&
          !used.has(c.slug) &&
          (window === null || ageHours(c, now) <= window),
      )
      .slice(0, size)
      .map(take);
    if (stories.length > 0) blocks.push({ section, stories, row: !section.financial });
  }

  const latest = [...shown]
    .filter(
      (c) =>
        !used.has(c.slug) &&
        c.section !== "eureka" &&
        ageHours(c, now) <= TOP_SLOT_MAX_AGE_H,
    )
    .sort((a, b) => Date.parse(b.eventTime) - Date.parse(a.eventTime))
    .slice(0, LATEST_SIZE)
    .map(take);

  return {
    gcc,
    lead,
    leadLabel: pick?.label ?? null,
    heroSide,
    threeUp,
    blocks,
    latest,
  };
}
