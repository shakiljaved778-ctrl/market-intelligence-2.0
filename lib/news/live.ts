import type { WireCluster } from "@/lib/news/read";

/**
 * The homepage's Live news ticker (owner request, 2026-11-19). PURE: from the
 * ranked wire to the headlines the ticker scrolls.
 *
 *  1. Stories carrying a current editorial entry flagged `live`
 *     (content/editorial.ts) lead, in rank order.
 *  2. Then the newest stories from the last LIVE_MAX_AGE_H hours.
 *  3. At most LIVE_TICKER_SIZE items, each story once. With nothing fresh the
 *     ticker is omitted — it never shows an old story as live.
 */
export const LIVE_TICKER_SIZE = 8;
export const LIVE_MAX_AGE_H = 12;

export interface LiveItem {
  cluster: WireCluster;
  /** True for an editor-flagged live story. */
  flagged: boolean;
}

export function liveTicker(
  ranked: WireCluster[],
  liveIds: ReadonlySet<number>,
  now: number = Date.now(),
): LiveItem[] {
  const out: LiveItem[] = [];
  const seen = new Set<string>();
  for (const c of ranked) {
    if (out.length >= LIVE_TICKER_SIZE) break;
    if (c.articleIds.some((id) => liveIds.has(id))) {
      out.push({ cluster: c, flagged: true });
      seen.add(c.slug);
    }
  }
  const fresh = ranked
    .filter((c) => !seen.has(c.slug) && c.section !== "eureka")
    .map((c) => ({ c, t: Date.parse(c.eventTime) }))
    .filter(({ t }) => Number.isFinite(t) && t <= now + 3_600_000)
    .filter(({ t }) => now - t <= LIVE_MAX_AGE_H * 3_600_000)
    .sort((a, b) => b.t - a.t);
  for (const { c } of fresh) {
    if (out.length >= LIVE_TICKER_SIZE) break;
    out.push({ cluster: c, flagged: false });
  }
  return out;
}
