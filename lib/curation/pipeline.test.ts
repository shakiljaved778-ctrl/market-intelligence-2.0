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

// Real QNA economy headlines (probe of 2026-11-19), each with the agency's
// dateline, as ingest stores them.
describe("clustering — one agency's unrelated Gulf stories stay separate", () => {
  const base = Date.parse("2026-11-18T06:00:00Z");
  const qna = (id: number, sourceId: string, headline: string, body: string) => ({
    id,
    sourceId,
    trustScore: 90,
    headline,
    dek: `Doha, November 18 (QNA) - ${body}`,
    publishedAt: new Date(base + id * 1_800_000).toISOString(),
  });
  const items = [
    qna(
      1,
      "qna-economy-local",
      "Qatar Concludes National Product Week to Promote Local Industries",
      "The ministry concluded National Product Week to promote local industries.",
    ),
    qna(
      2,
      "qna-economy-local",
      "Qatar Chamber: Promising Opportunities to Strengthen Qatar-Malaysia Trade Partnerships",
      "Qatar Chamber said there were promising opportunities to strengthen trade with Malaysia.",
    ),
    qna(
      3,
      "qna-economy-local",
      "Qatar Launches Third Winter Aswaq Festival to Promote Local Produce",
      "The third Winter Aswaq festival opened to promote local produce.",
    ),
    qna(
      4,
      "qna-economy-local",
      "Ooredoo Secures Authorization to Build International Fiber Optic Transit Network Across Iraq",
      "Ooredoo Group secured authorization to build a fibre transit network across Iraq.",
    ),
    qna(
      5,
      "qna-economy-local",
      "Digital Ecosystem Conference Concludes, Drafting Doha Principles to Advance Trusted Digital Economies",
      "Ooredoo Group wrapped up the Digital Ecosystem Conference and Exhibition 2026.",
    ),
    qna(
      6,
      "qna-economy-local",
      "QSE Index Opens Lower",
      "The Qatar Stock Exchange (QSE) index went down by 0.86% in early trading.",
    ),
    qna(
      7,
      "qna-economy-international",
      "European Stocks Close Lower",
      "European stocks closed lower on Tuesday as investors weighed rate expectations.",
    ),
  ];
  const ctx = {
    tiers: { "qna-economy-local": "wire", "qna-economy-international": "wire" },
    tickerMovePct: {},
    now: new Date(base + 24 * 3_600_000),
  };

  it("gives every unrelated story its own cluster", async () => {
    const ranked = await runPipeline(items, ctx, new HashEmbedder());
    expect(ranked).toHaveLength(items.length);
  });

  it("does not let a Gulf market report join a global one", async () => {
    const ranked = await runPipeline([items[5]!, items[6]!], ctx, new HashEmbedder());
    expect(ranked).toHaveLength(2);
  });
});
