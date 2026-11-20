import { isFinancialSection } from "@/lib/curation/section";
import { isGccRegion } from "@/lib/curation/region";
import type { WireCluster } from "@/lib/news/read";

/**
 * The three broad headlines that open the homepage (owner request,
 * 2026-11-20). PURE, from the ranked wire:
 *
 *  1. Global financial markets — the Mizaan Original when a fresh one exists
 *     (the caller passes `hasOriginal`), otherwise the top-ranked fresh
 *     Markets story from outside the Gulf.
 *  2. GCC — the top-ranked fresh Gulf story, financial sections first.
 *  3. General finance — the top-ranked fresh financial story from outside the
 *     Gulf that is not already shown (economy, deals, banking …).
 *
 * Each slot takes a story from the last TOP_STORY_MAX_AGE_H hours; when none
 * fits, the best one from the last TOP_STORY_FALLBACK_H hours, so the page
 * always opens with three headlines. A slot with no candidate at all is null.
 */
export const TOP_STORY_MAX_AGE_H = 48;
export const TOP_STORY_FALLBACK_H = 168;

export interface TopStories {
  global: WireCluster | null;
  gcc: WireCluster | null;
  finance: WireCluster | null;
}

export function topStories(
  ranked: WireCluster[],
  opts: { now?: number; hasOriginal?: boolean } = {},
): TopStories {
  const now = opts.now ?? Date.now();
  const within = (h: number) =>
    ranked.filter((c) => {
      const t = Date.parse(c.eventTime);
      return Number.isFinite(t) && now - t <= h * 3_600_000;
    });
  const fresh = within(TOP_STORY_MAX_AGE_H);
  const week = within(TOP_STORY_FALLBACK_H);
  const used = new Set<string>();
  const take = (pred: (c: WireCluster) => boolean): WireCluster | null => {
    const hit =
      fresh.find((c) => !used.has(c.slug) && pred(c)) ??
      week.find((c) => !used.has(c.slug) && pred(c)) ??
      null;
    if (hit) used.add(hit.slug);
    return hit;
  };
  const global = opts.hasOriginal
    ? null
    : take((c) => c.section === "markets" && !isGccRegion(c.region));
  const gcc =
    take((c) => isGccRegion(c.region) && isFinancialSection(c.section)) ??
    take((c) => isGccRegion(c.region));
  const finance =
    take(
      (c) =>
        c.section !== "markets" &&
        isFinancialSection(c.section) &&
        !isGccRegion(c.region),
    ) ?? take((c) => isFinancialSection(c.section) && !isGccRegion(c.region));
  return { global, gcc, finance };
}
