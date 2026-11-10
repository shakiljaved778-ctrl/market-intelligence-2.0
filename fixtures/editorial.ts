import type { RawArticle } from "@/fixtures/articles";

/**
 * Owner-curated EDITORIAL stories — real, published, cited items an editor
 * promotes into the LIVE wire by hand (e.g. to pair with an Editor's Pick rule).
 *
 * These are NOT fabricated demo fixtures: each is a real article, shown the same
 * way as any other story — headline + a short attributed dek (≤40 words) + source
 * name + timestamp + an outbound "Read at source" link. We never store or
 * reproduce the source's body, and never scrape it (§10); we only link out. The
 * dek is our own attributed one-liner, not copied from the source. Unlike the
 * demo fixtures (which are dropped in live mode), these are kept in the live wire
 * because they are real, cited stories.
 *
 * IDs start at 90000 so they never collide with ingested or fixture ids.
 */
export const EDITORIAL_ARTICLES: RawArticle[] = [
  {
    id: 90001,
    sourceId: "bloomberg",
    sourceName: "Bloomberg",
    tier: "outlet",
    trustScore: 85,
    headline:
      "Nvidia CEO Jensen Huang's affair with alleged spy raises succession concerns",
    dek: "Bloomberg reports that an alleged relationship between Nvidia chief executive Jensen Huang and a suspected spy has sharpened questions over succession at the chipmaker. Read the full feature at the source.",
    url: "https://www.bloomberg.com/news/features/2026-11-09/nvidia-ceo-jensen-huang-s-affair-with-alleged-spy-raises-succession-concerns?srnd=homepage-middle-east",
    publishedAt: "2026-11-09T12:00:00.000Z",
  },
];
