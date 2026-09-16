import { beforeEach, describe, expect, it } from "vitest";
import { FIXTURE_ARTICLES } from "@/fixtures/articles";
import { __resetClassifyCache } from "./classify";
import { clusterArticles } from "./cluster";
import { HashEmbedder } from "./embed";
import { runPipeline, toClusterInput } from "./pipeline";
import type { RankContext } from "./rank";

const embedder = new HashEmbedder();

function ctx(): RankContext {
  const tiers: Record<string, string> = {};
  for (const a of FIXTURE_ARTICLES) tiers[a.sourceId] = a.tier;
  return {
    tiers,
    tickerMovePct: { AAPL: 0.6 },
    now: new Date("2026-09-16T20:00:00.000Z"),
  };
}

describe("clustering a multi-source event (§9 gate)", () => {
  beforeEach(() => __resetClassifyCache());

  it("merges the four Fed reports into ONE cluster, not four", async () => {
    const inputs = FIXTURE_ARTICLES.map(toClusterInput);
    const clusters = await clusterArticles(inputs, embedder);

    const fed = clusters.find((c) => c.articleIds.includes(1));
    expect(fed).toBeDefined();
    expect(fed?.articleIds.sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
    // Distinct sources → the source count that IS the ranking.
    expect(fed?.sourceCount).toBe(4);
    // Title comes from the highest-trust source (the Fed itself), never synthesised.
    expect(fed?.primaryId).toBe(1);
    expect(fed?.title).toContain("Federal Reserve");
  });

  it("merges the three OPEC reports into one cluster and keeps singletons apart", async () => {
    const inputs = FIXTURE_ARTICLES.map(toClusterInput);
    const clusters = await clusterArticles(inputs, embedder);

    const opec = clusters.find((c) => c.articleIds.includes(5));
    expect(opec?.articleIds.sort((a, b) => a - b)).toEqual([5, 6, 7]);

    const sec = clusters.find((c) => c.articleIds.includes(8));
    expect(sec?.articleIds).toEqual([8]); // regulator enforcement — its own story
  });
});

describe("runPipeline ranking + slugs", () => {
  beforeEach(() => __resetClassifyCache());

  it("ranks clusters and assigns a stable slug", async () => {
    const articles = FIXTURE_ARTICLES.map((a) => ({
      id: a.id,
      sourceId: a.sourceId,
      trustScore: a.trustScore,
      headline: a.headline,
      dek: a.dek,
      publishedAt: a.publishedAt,
    }));
    const a = await runPipeline(articles, ctx(), embedder);
    const b = await runPipeline(articles, ctx(), embedder);

    expect(a.map((c) => c.slug)).toEqual(b.map((c) => c.slug)); // deterministic
    // Sorted by importance descending.
    for (let i = 1; i < a.length; i += 1) {
      expect((a[i - 1]?.importanceScore ?? 0) >= (a[i]?.importanceScore ?? 0)).toBe(
        true,
      );
    }
    // The Fed cluster (4 sources, primary tier) outranks a single-source story.
    const fed = a.find((c) => c.articleIds.includes(1));
    const apple = a.find((c) => c.articleIds.includes(9));
    expect((fed?.importanceScore ?? 0) > (apple?.importanceScore ?? 0)).toBe(true);
  });
});
