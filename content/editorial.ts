import type { RawArticle } from "@/lib/content/authored";

/**
 * Owner-curated EDITORIAL stories — real, published, cited items an editor
 * promotes into the wire by hand.
 *
 * Rules (enforced in code and by content/editorial.test.ts):
 *  - Each entry is a real article we link out to: headline + a short attributed
 *    dek (≤40 words, our own words) + source name + timestamp + URL. We never
 *    store or reproduce the source's body (§10).
 *  - The dek must be written by someone who has READ the article. Do not add an
 *    entry from a headline alone, and do not add a single-source allegation
 *    about a named person.
 *  - Every entry EXPIRES. It leaves the wire `EDITORIAL_TTL_HOURS` after its
 *    `publishedAt` (or at `expiresAt` if set), so a hand-picked story can never
 *    hold a top slot for days.
 *
 * IDs start at 90000 so they never collide with ingested or demo ids.
 */
export interface EditorialArticle extends RawArticle {
  /** ISO time after which the entry is dropped. Defaults to publishedAt + TTL. */
  expiresAt?: string;
  /**
   * Leads the homepage's Live news ticker while it is current (owner request,
   * 2026-11-19). Still expires like every entry.
   */
  live?: boolean;
}

export const EDITORIAL_TTL_HOURS = 72;

export function isEditorialCurrent(
  a: EditorialArticle,
  now: number = Date.now(),
): boolean {
  const published = Date.parse(a.publishedAt);
  if (!Number.isFinite(published)) return false;
  const expires = a.expiresAt
    ? Date.parse(a.expiresAt)
    : published + EDITORIAL_TTL_HOURS * 3_600_000;
  return Number.isFinite(expires) && now < expires && now >= published - 3_600_000;
}

/**
 * Anthropic's Nasdaq listing (ticker ANT), 18–19 Nov 2026 — added at the
 * owner's request as the homepage's live story. The three reports cluster into
 * one story with three sources. Deks restate only facts the outlets report in
 * their headlines and in their coverage of the pricing; times are the evening
 * the IPO priced (New York) and the morning of the first trade.
 */
export const EDITORIAL_ARTICLES: EditorialArticle[] = [
  {
    id: 90101,
    sourceId: "npr",
    sourceName: "NPR",
    tier: "outlet",
    trustScore: 85,
    headline: "Anthropic IPO raises record $81.3 billion on strong AI demand",
    dek: "Anthropic priced its initial public offering above its marketed range and raised $81.3 billion, the largest IPO on record, NPR reports. The shares start trading on Nasdaq under the ticker ANT on 19 November.",
    url: "https://www.npr.org/2026/11/18/nx-s1-6046212/anthropic-record-ipo-price",
    publishedAt: "2026-11-19T00:30:00.000Z",
    live: true,
  },
  {
    id: 90102,
    sourceId: "cnbc",
    sourceName: "CNBC",
    tier: "outlet",
    trustScore: 85,
    headline:
      "Anthropic IPO raises over $81 billion in largest offering on record, topping SpaceX",
    dek: "CNBC reports Anthropic's offering raised more than $81 billion, overtaking SpaceX's listing earlier this year as the biggest IPO ever. Anthropic had set a price range of $70 to $78 a share on 10 November.",
    url: "https://www.cnbc.com/2026/11/18/anthropic-ipo-ai-offering-price.html",
    publishedAt: "2026-11-19T00:15:00.000Z",
    live: true,
  },
  {
    id: 90103,
    sourceId: "aljazeera",
    sourceName: "Al Jazeera",
    tier: "outlet",
    trustScore: 80,
    headline: "Anthropic raises $81.3bn in biggest IPO of all time",
    dek: "Al Jazeera reports Anthropic raised $81.3bn, overtaking the $75bn SpaceX raised in its market debut in June to become the largest initial public offering in history.",
    url: "https://www.aljazeera.com/economy/2026/11/19/anthropic-raises-81-3bn-in-biggest-ipo-of-all-time",
    publishedAt: "2026-11-19T09:00:00.000Z",
    live: true,
  },
];

/** Ids of current editorial entries flagged for the Live ticker. */
export function liveEditorialIds(now: number = Date.now()): Set<number> {
  return new Set(
    EDITORIAL_ARTICLES.filter((a) => a.live && isEditorialCurrent(a, now)).map(
      (a) => a.id,
    ),
  );
}
