import { describe, expect, it } from "vitest";
import { clusterArticles } from "./cluster";
import { HashEmbedder } from "./embed";
import { toClusterInput, type PipelineArticle } from "./pipeline";

/**
 * Regression (2026-11-27): thirteen unrelated reports chained into one cluster
 * behind a Bank of England notice, which then led the homepage as a
 * "6 sources" story carrying GOOGL, META and NFLX. The headlines and deks below
 * are the real ones (deks shortened). With no shared ticker or specific entity,
 * none of them may merge.
 */
const H = 3_600_000;
const now = Date.parse("2026-11-27T19:00:00Z");
const at = (hoursAgo: number) => new Date(now - hoursAgo * H).toISOString();

const REPORTS: [string, string, string, number][] = [
  [
    "boe-news",
    "Statistical Notice 2026/09 - Update to the classification of accounts guide",
    "Statistical Notices update the definitions and guidance contained in the Banking Statistics Yellow Folder",
    24,
  ],
  [
    "the-conversation-uk",
    "Andy Burnham’s Brussels deal throws up a paradox for both sides in the EU debate",
    "At a summit in Brussels this month, UK Prime Minister Andy Burnham revealed breakthroughs in the UK-EU reset begun under his predecessor.",
    24,
  ],
  [
    "the-conversation",
    "To move across Arabia, stone-age humans needed both water and the right kinds of rock",
    "For the past two decades, the story of how our species left Africa has been told primarily in terms of water.",
    23,
  ],
  [
    "conversation-au-health",
    "Does drinking raw milk actually deliver extra health benefits? Here’s the science",
    "The popularity of raw milk Google searches and Instagram post topics has soared over the past ten years, spurred on by influencers.",
    22,
  ],
  [
    "the-conversation",
    "Elon Musk has approval to launch 1 million satellites. An astronomer explains how this would impact the sky",
    "A long-exposure image of the Orion Nebula showing satellite trails in mid-December.",
    20,
  ],
  [
    "the-conversation",
    "In the digital age, the ABC is more important than ever. Margaret Simons’ new book reveals why",
    "Communication technologies have changed so rapidly and so dramatically this century, it blinds us to the enormity of the challenges.",
    19,
  ],
  [
    "conversation-au-health",
    "Melbourne’s safe injecting room is one of the world’s busiest. The Liberals have vowed to close it",
    "Supervised injecting facilities are some of the most effective, yet most misunderstood health services in the world.",
    18,
  ],
  [
    "the-conversation",
    "How have the Kangaroos become such an AFLW powerhouse? And can the Demons upset them in the grand final?",
    "Tonight’s AFLW grand final might appear to be an impossible task for Melbourne.",
    16,
  ],
  [
    "the-conversation",
    "Controversial Netflix hit The Body blends 2000s nostalgia, Catholic satire and queer longing",
    "As far as TV episode titles go, you would be hard-pressed to find many more inflammatory ones.",
    9,
  ],
  [
    "qna-world-economy",
    "Russia Extends Jet Fuel Exports Ban Until March 2027",
    "Moscow, November 27 (QNA) - Russia has announced the extension of its ban on the export of jet fuel until March 31, 2027.",
    7,
  ],
  [
    "the-conversation",
    "Lebanon facing uncertain future as UN peacekeepers prepare to depart",
    "Lebanon is facing an uncertain future, with the UN peacekeeping mission in the south of the country drawing to a close in December.",
    5,
  ],
  [
    "qna-world-economy",
    "French GDP Contracts in Q3 of 2026",
    "Paris, November 27 (QNA) - France's gross domestic product contracted by 0.2 percent in the third quarter of this year.",
    4,
  ],
  [
    "rbi-press",
    "Thirty First Meeting of the Standing Advisory Committee (SAC) to Review the Flow of Credit to the MSME Sector in Kolkata",
    "The 31st meeting of the Standing Advisory Committee to review the flow of credit to the MSME sector was held in Kolkata.",
    1,
  ],
];

describe("clustering does not chain unrelated reports", () => {
  it("keeps thirteen unrelated real reports as thirteen clusters", async () => {
    const articles: PipelineArticle[] = REPORTS.map(
      ([sourceId, headline, dek, h], i) => ({
        id: i + 1,
        sourceId,
        trustScore: 0.7,
        headline,
        dek,
        publishedAt: at(h),
      }),
    );
    const clusters = await clusterArticles(
      articles.map(toClusterInput),
      new HashEmbedder(),
    );
    expect(clusters).toHaveLength(REPORTS.length);
    expect(clusters.every((c) => c.articleIds.length === 1)).toBe(true);
  });

  it("still merges a near-copy of the same text with no shared entity", async () => {
    const base = {
      trustScore: 0.7,
      dek: "Statistical Notices update the definitions and guidance contained in the Banking Statistics Yellow Folder",
      publishedAt: at(2),
    };
    const clusters = await clusterArticles(
      [
        toClusterInput({
          ...base,
          id: 1,
          sourceId: "boe-news",
          headline:
            "Statistical Notice 2026/09 - Update to the classification of accounts guide",
        }),
        toClusterInput({
          ...base,
          id: 2,
          sourceId: "other-feed",
          headline:
            "Statistical Notice 2026/09: update to the classification of accounts guide",
        }),
      ],
      new HashEmbedder(),
    );
    expect(clusters).toHaveLength(1);
  });
});

describe("EDGAR filing feeds never chain (2026-11-28)", () => {
  it("keeps two templated S-1 entries for different companies apart", async () => {
    const { edgarFilingItem } = await import("./edgar");
    const a = edgarFilingItem("S-1 - ACME HOLDINGS INC (0001234567) (Filer)")!;
    const b = edgarFilingItem("S-1 - ACME HOLDINGS GROUP INC (0007654321) (Filer)")!;
    const clusters = await clusterArticles(
      [a, b].map((f, i) =>
        toClusterInput({
          id: i + 1,
          sourceId: "sec-edgar-registrations",
          trustScore: 0.95,
          headline: f.headline,
          dek: f.dek,
          publishedAt: at(1 + i),
        }),
      ),
      new HashEmbedder(),
    );
    expect(clusters).toHaveLength(2);
  });
});
