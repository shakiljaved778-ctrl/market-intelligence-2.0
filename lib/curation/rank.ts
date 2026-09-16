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
export const RECENCY_FLOOR = 0.3;

export const TIER_WEIGHT: Record<string, number> = {
  regulator: 1.0,
  primary: 1.0,
  wire: 0.7,
  outlet: 0.4,
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

export function computeImportance(cluster: ClusterResult, ctx: RankContext): number {
  const now = ctx.now ?? new Date();
  const weighted =
    W_SOURCES * sourceScore(cluster.sourceCount) +
    W_TIER * tierScore(cluster.sourceIds, ctx.tiers) +
    W_MARKET * marketScore(cluster.tickers, ctx.tickerMovePct) +
    W_PRIMARY * primaryScore(cluster.sourceIds, ctx.tiers);
  return Math.round(100 * weighted * recencyFactor(cluster.eventTime, now));
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
