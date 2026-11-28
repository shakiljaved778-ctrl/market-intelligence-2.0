import type { ClusterResult } from "./cluster";

/**
 * Importance scoring (§9 Stage 4) — the editorial judgement of the product, in
 * ONE place with named, tunable weights. Score is 0–100.
 *
 * importance = 100 · weightedSum · recencyFactor, where
 *   weightedSum = W_SOURCES·sourceScore   (count of DISTINCT sources, log-scaled)
 *               + W_TIER·tierScore        (tier weighting of those sources)
 *               + W_MARKET·marketScore    (abs move × liquidity of tickers)
 *               + W_PRIMARY·primaryScore  (a regulator/primary source present?)
 *   recencyFactor decays with age but never below RECENCY_FLOOR, so a heavily
 *   covered story doesn't vanish the moment it ages.
 *
 * Weights sum to 1 and are documented in CLAUDE.md alongside the tuning notes.
 */
export const W_SOURCES = 0.4;
export const W_TIER = 0.2;
export const W_MARKET = 0.25;
export const W_PRIMARY = 0.15;

export const MAX_SOURCES = 8;
export const MOVE_CAP_PCT = 5;
export const RECENCY_HALF_LIFE_H = 18;
// Floor lowered 0.30 → 0.18 so a well-covered but days-old story (e.g. last
// week's regulator minutes) decays further and no longer crowds fresh content
// off the homepage, while still never vanishing entirely.
export const RECENCY_FLOOR = 0.18;

export const TIER_WEIGHT: Record<string, number> = {
  regulator: 1.0,
  primary: 1.0,
  wire: 0.7,
  // outlet raised 0.4 → 0.55 so a fresh, reputable outlet story (e.g. The
  // Conversation) can surface on the homepage rather than sitting far below the
  // institutional feeds. Still below wire (0.7) and regulator/primary (1.0).
  outlet: 0.55,
};

export interface RankContext {
  /** sourceId → tier. */
  tiers: Record<string, string>;
  /** ticker → absolute latest % move (currency-neutral). */
  tickerMovePct: Record<string, number>;
  now?: Date;
}

function sourceScore(sourceCount: number): number {
  return Math.min(1, Math.log2(1 + sourceCount) / Math.log2(1 + MAX_SOURCES));
}

function tierScore(sourceIds: string[], tiers: Record<string, string>): number {
  if (sourceIds.length === 0) return 0;
  const avg =
    sourceIds.reduce(
      (sum, id) => sum + (TIER_WEIGHT[tiers[id] ?? "outlet"] ?? 0.4),
      0,
    ) / sourceIds.length;
  return avg;
}

function marketScore(tickers: string[], moves: Record<string, number>): number {
  let max = 0;
  for (const t of tickers) max = Math.max(max, Math.abs(moves[t] ?? 0));
  return Math.min(1, max / MOVE_CAP_PCT);
}

function primaryScore(sourceIds: string[], tiers: Record<string, string>): number {
  return sourceIds.some((id) => tiers[id] === "regulator" || tiers[id] === "primary")
    ? 1
    : 0;
}

function recencyFactor(eventTime: string, now: Date): number {
  const ageH = Math.max(0, (now.getTime() - new Date(eventTime).getTime()) / 3_600_000);
  const decay = Math.pow(0.5, ageH / RECENCY_HALF_LIFE_H);
  return RECENCY_FLOOR + (1 - RECENCY_FLOOR) * decay;
}

/**
 * The importance score taken apart (2026-11-27): each factor's 0–1 score, its
 * weight, and its points before the recency factor. computeImportance is
 * built from this, so the "Why this story is ranked here" panel can never
 * disagree with the score shown.
 */
export interface ImportanceBreakdown {
  factors: {
    id: "sources" | "tier" | "market" | "primary";
    score: number;
    weight: number;
    /** weight × score × 100, before recency. */
    points: number;
  }[];
  /** The largest |move| among the story's instruments, in percent. */
  maxMovePct: number;
  recency: number;
  total: number;
}

export function explainImportance(
  cluster: Pick<ClusterResult, "sourceCount" | "sourceIds" | "tickers" | "eventTime">,
  ctx: RankContext,
): ImportanceBreakdown {
  const now = ctx.now ?? new Date();
  const parts = [
    {
      id: "sources" as const,
      weight: W_SOURCES,
      score: sourceScore(cluster.sourceCount),
    },
    {
      id: "tier" as const,
      weight: W_TIER,
      score: tierScore(cluster.sourceIds, ctx.tiers),
    },
    {
      id: "market" as const,
      weight: W_MARKET,
      score: marketScore(cluster.tickers, ctx.tickerMovePct),
    },
    {
      id: "primary" as const,
      weight: W_PRIMARY,
      score: primaryScore(cluster.sourceIds, ctx.tiers),
    },
  ];
  const weighted = parts.reduce((sum, p) => sum + p.weight * p.score, 0);
  const recency = recencyFactor(cluster.eventTime, now);
  let maxMovePct = 0;
  for (const t of cluster.tickers)
    maxMovePct = Math.max(maxMovePct, Math.abs(ctx.tickerMovePct[t] ?? 0));
  return {
    factors: parts.map((p) => ({ ...p, points: 100 * p.weight * p.score })),
    maxMovePct,
    recency,
    total: Math.round(100 * weighted * recency),
  };
}

export function computeImportance(cluster: ClusterResult, ctx: RankContext): number {
  return explainImportance(cluster, ctx).total;
}

export interface RankedCluster extends ClusterResult {
  importanceScore: number;
}

export function rankClusters(
  clusters: ClusterResult[],
  ctx: RankContext,
): RankedCluster[] {
  return clusters
    .map((c) => ({ ...c, importanceScore: computeImportance(c, ctx) }))
    .sort((a, b) => b.importanceScore - a.importanceScore);
}
