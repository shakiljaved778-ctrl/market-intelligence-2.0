/**
 * Fixture wire so /news renders and the clustering demo works with ZERO keys.
 * These carry headline + dek + link + timestamp + source (+ an optional image
 * REFERENCE) ONLY — never body text (§10). The Fed and OPEC events are each
 * covered by several sources so the clusterer can be shown to merge them.
 *
 * Editorial mix (§13): Mizan is markets-first, but at least ~30% of the wire is
 * deliberately NON-FINANCIAL (tech/AI, sports, health, culture, science) to keep
 * a broad audience engaged. The ratio is guarded by lib/curation/section.test.ts.
 *
 * `imageUrl` is a REFERENCE (a URL to the source's own media / an og:image), not
 * stored article text — it never violates the "no body column" invariant (§10,
 * §17). It is optional; when absent the UI renders a deterministic on-brand
 * cover (components/news/CoverArt.tsx) so every card carries an image offline.
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
  imageUrl?: string | null;
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

  // --- Singletons (markets) ---
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

  // --- Nvidia earnings: one event, two sources → one cluster (markets) ---
  {
    id: 10,
    sourceId: "outlet-a",
    sourceName: "Market Outlet A",
    tier: "outlet",
    trustScore: 60,
    headline: "Nvidia earnings beat as data-center revenue jumps again",
    dek: "Nvidia reported quarterly results above guidance, led by surging data-center revenue.",
    url: "https://outlet-a.example/nvidia",
    publishedAt: `${T}07:00.000Z`,
  },
  {
    id: 11,
    sourceId: "outlet-b",
    sourceName: "Market Outlet B",
    tier: "outlet",
    trustScore: 58,
    headline: "Nvidia tops earnings estimates on data-center demand",
    dek: "The chipmaker's quarterly revenue beat expectations as data-center demand held firm.",
    url: "https://outlet-b.example/nvidia",
    publishedAt: `${T}07:40.000Z`,
  },

  // --- GCC / Qatar (markets) ---
  {
    id: 12,
    sourceId: "gcc-outlet",
    sourceName: "Gulf Business Wire",
    tier: "outlet",
    trustScore: 55,
    headline: "Qatar's QNB posts higher quarterly profit as Gulf banks strengthen",
    dek: "Qatar National Bank reported stronger quarterly results amid resilient Gulf lending.",
    url: "https://gulf-wire.example/qnb",
    publishedAt: `${T}08:00.000Z`,
  },

  // --- Macro / economy singletons ---
  {
    id: 13,
    sourceId: "worldbank-org",
    sourceName: "World Bank",
    tier: "primary",
    trustScore: 98,
    headline: "World Bank lifts global growth forecast on easing inflation",
    dek: "The World Bank raised its growth forecast, citing cooling inflation and steadier trade.",
    url: "https://worldbank.org/news/growth",
    publishedAt: `${T}03:00.000Z`,
  },
  {
    id: 14,
    sourceId: "bls-gov",
    sourceName: "U.S. Bureau of Labor Statistics",
    tier: "primary",
    trustScore: 98,
    headline: "US inflation cools to slowest pace in three years",
    dek: "Consumer prices rose less than expected in the latest reading, easing cost-of-living pressure.",
    url: "https://bls.gov/news/cpi",
    publishedAt: `${T}03:20.000Z`,
  },

  // --- Crypto + a markets single ---
  {
    id: 15,
    sourceId: "outlet-c",
    sourceName: "Market Outlet C",
    tier: "outlet",
    trustScore: 55,
    headline: "Bitcoin rallies to a fresh high as institutional inflows build",
    dek: "The token climbed to a new high, extending a rally driven by steady institutional inflows.",
    url: "https://outlet-c.example/bitcoin",
    publishedAt: `${T}05:30.000Z`,
  },
  {
    id: 16,
    sourceId: "outlet-d",
    sourceName: "Market Outlet D",
    tier: "outlet",
    trustScore: 52,
    headline: "Tesla shares slide after it trims delivery outlook",
    dek: "The automaker cut its delivery guidance for the year, sending shares lower in late trade.",
    url: "https://outlet-d.example/tesla",
    publishedAt: `${T}06:30.000Z`,
  },

  // ============================================================
  // NON-FINANCIAL editorial mix (§13) — ~30% of the wire.
  // ============================================================

  // --- Tech & AI: one event, two sources → one cluster ---
  {
    id: 17,
    sourceId: "tech-wire",
    sourceName: "Tech Wire",
    tier: "wire",
    trustScore: 70,
    headline: "OpenAI unveils new AI model with major reasoning gains",
    dek: "The company said its latest artificial intelligence model sharply improves reasoning and cuts errors.",
    url: "https://tech-wire.example/openai-model",
    publishedAt: `${T}09:30.000Z`,
  },
  {
    id: 18,
    sourceId: "tech-outlet",
    sourceName: "Tech Outlet",
    tier: "outlet",
    trustScore: 55,
    headline: "OpenAI launches new AI model, touts reasoning improvements",
    dek: "OpenAI's new artificial intelligence model shows stronger reasoning, the company said.",
    url: "https://tech-outlet.example/openai",
    publishedAt: `${T}10:10.000Z`,
  },

  // --- Sports: one event, two sources → one cluster ---
  {
    id: 19,
    sourceId: "sports-wire",
    sourceName: "Sports Wire",
    tier: "wire",
    trustScore: 70,
    headline: "FIFA confirms expanded World Cup format for the 2030 tournament",
    dek: "Football's governing body approved a larger World Cup field for the 2030 tournament.",
    url: "https://sports-wire.example/worldcup",
    publishedAt: `${T}10:30.000Z`,
  },
  {
    id: 20,
    sourceId: "sports-outlet",
    sourceName: "Sports Outlet",
    tier: "outlet",
    trustScore: 52,
    headline: "World Cup 2030 to expand under new FIFA plan",
    dek: "FIFA approved an expanded World Cup, adding more teams to the 2030 football tournament.",
    url: "https://sports-outlet.example/worldcup",
    publishedAt: `${T}11:00.000Z`,
  },

  // --- Health: one event, two sources → one cluster ---
  {
    id: 21,
    sourceId: "who-news",
    sourceName: "World Health Organization",
    tier: "primary",
    trustScore: 96,
    headline: "WHO issues new guidance to curb rising dengue outbreaks",
    dek: "The World Health Organization urged stronger measures as dengue cases climb across several regions.",
    url: "https://who.int/news/dengue",
    publishedAt: `${T}09:45.000Z`,
  },
  {
    id: 22,
    sourceId: "health-outlet",
    sourceName: "Health Outlet",
    tier: "outlet",
    trustScore: 55,
    headline: "WHO warns on dengue as outbreaks spread, issues fresh guidance",
    dek: "New World Health Organization guidance targets a rise in dengue outbreaks worldwide.",
    url: "https://health-outlet.example/dengue",
    publishedAt: `${T}10:20.000Z`,
  },

  // --- Culture / entertainment singleton ---
  {
    id: 23,
    sourceId: "culture-outlet",
    sourceName: "Culture Desk",
    tier: "outlet",
    trustScore: 52,
    headline: "Sci-fi epic tops the global box office in a record opening weekend",
    dek: "The film drew record ticket sales worldwide, powered by strong streaming-era anticipation.",
    url: "https://culture-outlet.example/box-office",
    publishedAt: `${T}11:20.000Z`,
  },

  // --- Science singleton ---
  {
    id: 24,
    sourceId: "nasa-news",
    sourceName: "NASA",
    tier: "primary",
    trustScore: 96,
    headline: "NASA telescope captures the sharpest image yet of a distant galaxy",
    dek: "Researchers said the new telescope observation could reshape models of early galaxy formation.",
    url: "https://nasa.gov/news/telescope",
    publishedAt: `${T}08:40.000Z`,
  },

  // --- Second stories so Tech & Health also form front-page blocks ---
  {
    id: 25,
    sourceId: "tech-wire-b",
    sourceName: "Tech Wire",
    tier: "wire",
    trustScore: 70,
    headline: "Google reports a quantum error-correction milestone",
    dek: "The quantum processor crossed a key error-correction threshold, researchers said — a step toward practical machines.",
    url: "https://tech-wire.example/quantum",
    publishedAt: `${T}12:00.000Z`,
  },
  {
    id: 26,
    sourceId: "health-wire",
    sourceName: "Health Wire",
    tier: "primary",
    trustScore: 90,
    headline: "New Alzheimer's medicine clears a late-stage clinical trial",
    dek: "The medicine met its primary goal in a late-stage clinical trial, its developer said, lifting hopes for approval.",
    url: "https://health-wire.example/alzheimers",
    publishedAt: `${T}11:40.000Z`,
  },
  {
    id: 27,
    sourceId: "outlet-b",
    sourceName: "Market Outlet B",
    tier: "outlet",
    trustScore: 58,
    headline: "Gold climbs to a record as haven demand builds",
    dek: "Gold pushed to a fresh record as investors sought havens amid rate and geopolitical uncertainty.",
    url: "https://outlet-b.example/gold",
    publishedAt: `${T}12:30.000Z`,
  },
  {
    id: 28,
    sourceId: "bls-gov",
    sourceName: "U.S. Bureau of Labor Statistics",
    tier: "primary",
    trustScore: 98,
    headline: "Nonfarm payrolls beat forecasts in latest jobs report",
    dek: "Hiring exceeded expectations last month, with nonfarm payrolls climbing and jobless claims easing — a resilient labour market.",
    url: "https://bls.gov/news/payrolls",
    publishedAt: `${T}13:00.000Z`,
  },
];
