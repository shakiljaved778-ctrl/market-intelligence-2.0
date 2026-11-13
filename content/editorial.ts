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

/** No editorial entries are currently published. */
export const EDITORIAL_ARTICLES: EditorialArticle[] = [];
