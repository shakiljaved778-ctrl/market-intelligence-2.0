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

  it("keeps unrelated stories from one country's news agency apart", async () => {
    // Every Qatar News Agency story names Qatar; a shared country is not a
    // shared event (live over-merge found 14 Nov).
    const at = "2026-11-13T10:00:00.000Z";
    const qna = (id: number, headline: string, dek: string) =>
      toClusterInput({
        id,
        sourceId: "qna-economy-local",
        trustScore: 90,
        tier: "wire",
        headline,
        dek,
        publishedAt: at,
        url: `https://example.org/${id}`,
      } as (typeof FIXTURE_ARTICLES)[number]);
    const clusters = await clusterArticles(
      [
        qna(
          9101,
          "Qatar Stock Exchange Index Gains 52 Points",
          "Doha (QNA) - The Qatar Stock Exchange general index rose 0.49 percent to close at 10,640 points.",
        ),
        qna(
          9102,
          "Finance Ministry: Government Tenders Reach QAR 6 Billion in Q3 2026",
          "Doha (QNA) - Government tenders and auctions in Qatar totaled QAR 6 billion in the third quarter.",
        ),
      ],
      embedder,
    );
    expect(clusters).toHaveLength(2);
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
