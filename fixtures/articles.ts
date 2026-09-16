/**
 * Fixture wire so /news renders and the clustering demo works with ZERO keys.
 * These carry headline + dek + link + timestamp + source ONLY — never body text
 * (§10). The Fed and OPEC events are each covered by several sources so the
 * clusterer can be shown to merge them into one cluster.
 */
export interface RawArticle {
  id: number;
  sourceId: string;
  sourceName: string;
  tier: "wire" | "outlet" | "regulator" | "primary";
  trustScore: number;
  headline: string;
  dek: string | null;
  url: string;
  publishedAt: string;
}

const T = "2026-09-16T18:";

export const FIXTURE_ARTICLES: RawArticle[] = [
  // --- Fed decision: one event, four sources → one cluster ---
  {
    id: 1,
    sourceId: "fed-press",
    sourceName: "U.S. Federal Reserve",
    tier: "primary",
    trustScore: 100,
    headline: "Federal Reserve holds interest rates steady, signals patience on cuts",
    dek: "The FOMC left the policy rate unchanged and reiterated a data-dependent stance.",
    url: "https://federalreserve.gov/news/1",
    publishedAt: `${T}00:00.000Z`,
  },
  {
    id: 2,
    sourceId: "outlet-a",
    sourceName: "Market Outlet A",
    tier: "outlet",
    trustScore: 60,
    headline: "Fed keeps rates on hold as inflation cools",
    dek: "Policymakers held the benchmark rate steady amid easing consumer prices.",
    url: "https://outlet-a.example/fed",
    publishedAt: `${T}05:00.000Z`,
  },
  {
    id: 3,
    sourceId: "outlet-b",
    sourceName: "Market Outlet B",
    tier: "outlet",
    trustScore: 58,
    headline: "FOMC leaves policy rate unchanged, markets steady",
    dek: "The Federal Reserve's rate decision matched expectations for no change.",
    url: "https://outlet-b.example/fomc",
    publishedAt: `${T}09:00.000Z`,
  },
  {
    id: 4,
    sourceId: "outlet-c",
    sourceName: "Market Outlet C",
    tier: "outlet",
    trustScore: 55,
    headline: "US central bank stands pat on interest rates",
    dek: "No change to the policy rate as the Fed watches inflation and jobs data.",
    url: "https://outlet-c.example/rates",
    publishedAt: `${T}12:00.000Z`,
  },

  // --- OPEC+ / Brent: one event, three sources → one cluster ---
  {
    id: 5,
    sourceId: "outlet-a",
    sourceName: "Market Outlet A",
    tier: "outlet",
    trustScore: 60,
    headline: "OPEC+ holds output targets as Brent extends weekly decline",
    dek: "Oil producers kept quotas unchanged; Brent crude slipped for a third session.",
    url: "https://outlet-a.example/opec",
    publishedAt: `${T}02:00.000Z`,
  },
  {
    id: 6,
    sourceId: "outlet-b",
    sourceName: "Market Outlet B",
    tier: "outlet",
    trustScore: 58,
    headline: "Brent slides as OPEC keeps production steady",
    dek: "Crude prices fell after the OPEC+ meeting left output policy unchanged.",
    url: "https://outlet-b.example/brent",
    publishedAt: `${T}03:30.000Z`,
  },
  {
    id: 7,
    sourceId: "outlet-d",
    sourceName: "Market Outlet D",
    tier: "outlet",
    trustScore: 52,
    headline: "Oil prices dip after OPEC+ decision on quotas",
    dek: "WTI and Brent eased as the group maintained current production levels.",
    url: "https://outlet-d.example/oil",
    publishedAt: `${T}04:15.000Z`,
  },

  // --- Singletons ---
  {
    id: 8,
    sourceId: "sec-press",
    sourceName: "U.S. SEC",
    tier: "regulator",
    trustScore: 100,
    headline: "SEC charges investment adviser over disclosure failures",
    dek: "The regulator announced an enforcement action citing inadequate risk disclosures.",
    url: "https://sec.gov/news/8",
    publishedAt: `${T}01:00.000Z`,
  },
  {
    id: 9,
    sourceId: "outlet-a",
    sourceName: "Market Outlet A",
    tier: "outlet",
    trustScore: 60,
    headline: "Apple unveils new product line ahead of holiday quarter",
    dek: "Apple detailed upcoming devices as it heads into its key selling season.",
    url: "https://outlet-a.example/apple",
    publishedAt: `${T}06:00.000Z`,
  },
];
