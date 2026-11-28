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
 *  6. GCC news opens the page (owner requests, 2026-11-14 and 2026-11-19): a
 *     band of up to GCC_BAND_SIZE fresh GCC stories above the lead — the
 *     financial sections first, then other sections, each newest first. It is
 *     omitted when there are none.
 *  7. Two more finance bands follow the hero (owner request, 2026-11-19), each
 *     omitted when empty:
 *     - "Deals & IPOs": stories tagged with a DEAL_TOPICS topic (IPOs,
 *       private equity, mergers) from the last DEALS_MAX_AGE_H hours, newest
 *       first — deal news is rarer, so its window is a week;
 *     - "Global markets": fresh Markets stories outside the Gulf, newest first.
 */
export const TOP_SLOT_MAX_AGE_H = 72;
export const HERO_SIDE_SIZE = 3;
export const THREE_UP_SIZE = 3;
export const FINANCIAL_BLOCK_SIZE = 7;
export const NON_FINANCIAL_ROW_SIZE = 3;
export const LATEST_SIZE = 8;
export const GCC_BAND_SIZE = 8;
export const DEALS_BAND_SIZE = 4;
export const GLOBAL_MARKETS_BAND_SIZE = 4;
export const DEALS_MAX_AGE_H = 168;
/** Topics (content/topics.yaml) that put a story in the Deals & IPOs band. */
export const DEAL_TOPICS: readonly string[] = ["ipo", "private_equity", "mergers"];

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
  /** IPO, private-equity and M&A stories, newest first. */
  deals: WireCluster[];
  /** Markets stories outside the Gulf, newest first. */
  globalMarkets: WireCluster[];
  blocks: HomepageBlock[];
  latest: WireCluster[];
}

const HOUR_MS = 3_600_000;

function ageHours(c: WireCluster, now: number): number {
  const t = Date.parse(c.eventTime);
  return Number.isFinite(t) ? Math.max(0, (now - t) / HOUR_MS) : Infinity;
}

/**
 * Top-of-page variety (brief §4.4, 2026-11-28), applied to the lead, the side
 * rail and the three-up row in reading order: no two of the first three are
 * single-source reports from the same source, and no section takes more than
 * two of the first six. Soft: when the fresh pool cannot satisfy it, the next
 * strongest stories fill the slots, so the page is never short.
 */
export const TOP_DIVERSITY = {
  sourceWindow: 3,
  sectionWindow: 6,
  perSection: 2,
} as const;

const voice = (c: WireCluster): string | null =>
  c.sourceIds.length === 1 ? (c.sourceIds[0] ?? null) : null;

function fitsTop(c: WireCluster, placed: WireCluster[]): boolean {
  const pos = placed.length;
  const v = voice(c);
  if (
    pos < TOP_DIVERSITY.sourceWindow &&
    v !== null &&
    placed.slice(0, TOP_DIVERSITY.sourceWindow).some((p) => voice(p) === v)
  ) {
    return false;
  }
  if (
    pos < TOP_DIVERSITY.sectionWindow &&
    placed.slice(0, TOP_DIVERSITY.sectionWindow).filter((p) => p.section === c.section)
      .length >= TOP_DIVERSITY.perSection
  ) {
    return false;
  }
  return true;
}

/** PURE: the next `n` stories from `pool` for the top, honouring TOP_DIVERSITY. */
export function pickDiverse(
  pool: WireCluster[],
  n: number,
  placed: WireCluster[],
): WireCluster[] {
  const picked: WireCluster[] = [];
  const deferred: WireCluster[] = [];
  for (const c of pool) {
    if (picked.length >= n) break;
    if (fitsTop(c, [...placed, ...picked])) picked.push(c);
    else deferred.push(c);
  }
  for (const c of deferred) {
    if (picked.length >= n) break;
    picked.push(c);
  }
  return picked;
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

  // GCC band: fresh GCC stories, the financial sections first, then the rest,
  // each newest first.
  const newest = (a: WireCluster, b: WireCluster) =>
    Date.parse(b.eventTime) - Date.parse(a.eventTime);
  const gccFresh = (list: WireCluster[]) =>
    list.filter((c) => isGccRegion(c.region) && !used.has(c.slug)).sort(newest);
  const gcc = [...gccFresh(fin), ...gccFresh(nonFin)].slice(0, GCC_BAND_SIZE).map(take);

  // Lead: a current editor's pick, else the strongest fresh financial story not
  // already in the band.
  const leadStory =
    pick?.cluster ?? financialFirst.find((c) => !used.has(c.slug)) ?? null;
  const lead = leadStory ? take(leadStory) : null;

  const placed = lead ? [lead] : [];
  const heroSide = pickDiverse(
    financialFirst.filter((c) => !used.has(c.slug)),
    HERO_SIDE_SIZE,
    placed,
  ).map(take);
  placed.push(...heroSide);
  // The three-up row is the next strongest fresh stories from any section.
  const threeUp = pickDiverse(
    topPool.filter((c) => !used.has(c.slug)),
    THREE_UP_SIZE,
    placed,
  ).map(take);

  const newestFirst = (a: WireCluster, b: WireCluster) =>
    Date.parse(b.eventTime) - Date.parse(a.eventTime);
  const deals = shown
    .filter(
      (c) =>
        !used.has(c.slug) &&
        isFinancialSection(c.section) &&
        c.topics.some((t) => DEAL_TOPICS.includes(t)) &&
        ageHours(c, now) <= DEALS_MAX_AGE_H,
    )
    .sort(newestFirst)
    .slice(0, DEALS_BAND_SIZE)
    .map(take);
  const globalMarkets = topPool
    .filter(
      (c) => !used.has(c.slug) && c.section === "markets" && !isGccRegion(c.region),
    )
    .sort(newestFirst)
    .slice(0, GLOBAL_MARKETS_BAND_SIZE)
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
    deals,
    globalMarkets,
    blocks,
    latest,
  };
}

/**
 * No photo twice on the homepage (owner feedback, 2026-11-19). Walks the slots
 * in the order the page renders them and, for a story whose cover photo has
 * already appeared higher up, drops the photo — the card then shows its drawn
 * section cover. The cluster job also clears repeated photos at the source
 * (dedupeRecentCovers); this guarantees it on the page in the meantime.
 */
export function withUniqueCovers(
  layout: HomepageLayout,
  /** Photos already shown higher up (the top-stories row). */
  taken: ReadonlySet<string> = new Set(),
): HomepageLayout {
  const seen = new Set<string>(taken);
  const unique = (c: WireCluster): WireCluster => {
    if (!c.imageUrl) return c;
    if (seen.has(c.imageUrl)) return { ...c, imageUrl: null, imageCredit: null };
    seen.add(c.imageUrl);
    return c;
  };
  const gcc = layout.gcc.map(unique);
  const lead = layout.lead ? unique(layout.lead) : null;
  const heroSide = layout.heroSide.map(unique);
  const threeUp = layout.threeUp.map(unique);
  const deals = layout.deals.map(unique);
  const globalMarkets = layout.globalMarkets.map(unique);
  const blocks = layout.blocks.map((b) => ({ ...b, stories: b.stories.map(unique) }));
  const latest = layout.latest.map(unique);
  return {
    ...layout,
    gcc,
    lead,
    heroSide,
    threeUp,
    deals,
    globalMarkets,
    blocks,
    latest,
  };
}

/**
 * The order a band renders in: the first story with a photo leads (it takes
 * the band's big card), the rest keep their order (owner feedback, 2026-11-20:
 * an empty drawn cover in the band's main card read as a blank box). A band
 * with no photo at all is returned unchanged.
 */
export function photoFirst(stories: WireCluster[]): WireCluster[] {
  const i = stories.findIndex((c) => Boolean(c.imageUrl));
  if (i <= 0) return stories;
  return [stories[i]!, ...stories.slice(0, i), ...stories.slice(i + 1)];
}
