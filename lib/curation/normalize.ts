import { createHash } from "node:crypto";

/**
 * Normalisation for ingest (§9 Stage 1, §10). This type is the ONLY shape an
 * ingested item takes — note there is NO body field. We keep headline, dek
 * (≤40 words), link, timestamp and source; never article text.
 */
export interface NormalizedArticle {
  sourceId: string;
  url: string;
  canonicalUrl: string;
  headline: string;
  dek: string | null;
  publishedAt: string; // ISO
  author: string | null;
  rawHash: string;
}

export const DEK_WORD_LIMIT = 40;

/** Collapse whitespace and trim. */
export function normalizeText(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Truncate a dek to ≤40 words (§10). The formatter adds the ellipsis on render. */
export function truncateDek(text: string | null | undefined): string | null {
  if (!text) return null;
  const clean = normalizeText(text);
  if (!clean) return null;
  const words = clean.split(" ");
  if (words.length <= DEK_WORD_LIMIT) return clean;
  return words.slice(0, DEK_WORD_LIMIT).join(" ");
}

/** Strip tracking params and fragments so the same story dedupes across feeds. */
export function canonicalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    const drop = [...u.searchParams.keys()].filter(
      (k) => k.startsWith("utm_") || ["ref", "cmpid", "fbclid", "gclid"].includes(k),
    );
    for (const k of drop) u.searchParams.delete(k);
    u.hostname = u.hostname.replace(/^www\./, "");
    return u.toString();
  } catch {
    return url;
  }
}

/** Dedupe hash of the normalised headline (§9 Stage 1). */
export function headlineHash(headline: string): string {
  return createHash("sha1").update(normalizeText(headline).toLowerCase()).digest("hex");
}
