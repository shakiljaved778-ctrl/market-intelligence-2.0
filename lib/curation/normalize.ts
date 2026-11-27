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

// Zero-width and soft-hyphen characters ("FIBA \u200b\u200bBasketball").
const INVISIBLE = /[\u200B-\u200D\u2060\uFEFF\u00AD]/g;
/** C0 control characters other than tab/newline/CR, and DEL, become spaces. */
function dropControls(s: string): string {
  let out = "";
  for (const ch of s) {
    const c = ch.charCodeAt(0);
    const control = (c < 32 && c !== 9 && c !== 10 && c !== 13) || c === 127;
    out += control ? " " : ch;
  }
  return out;
}
/** A numeric character reference, or the original text when it is not valid. */
function codePoint(original: string, n: number): string {
  return Number.isInteger(n) && n > 0 && n <= 0x10ffff
    ? String.fromCodePoint(n)
    : original;
}
const NAMED_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
  "&lt;": "<",
  "&gt;": ">",
};

/**
 * Clean feed text for display (owner review, 2026-11-27): drop zero-width and
 * control characters, decode the HTML entities feeds leave behind, remove a
 * space before punctuation ("Tourism , Signs"), and collapse whitespace. Words
 * and punctuation are otherwise kept exactly as the source wrote them.
 */
export function cleanText(s: string): string {
  return (
    dropControls(s.replace(INVISIBLE, ""))
      // Numeric references first, so "&amp;#39;" is decoded only once.
      .replace(/&#(\d{1,7});/g, (m, n: string) => codePoint(m, Number(n)))
      .replace(/&#x([0-9a-f]{1,6});/gi, (m, h: string) => codePoint(m, parseInt(h, 16)))
      .replace(/&(?:amp|quot|#39|apos|nbsp|lt|gt);/g, (m) => NAMED_ENTITIES[m] ?? m)
      .replace(/\u00A0/g, " ")
      .replace(/\s+([,.;:!?])(?=\s|$)/g, "$1")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/** Clean and collapse whitespace (ingest). */
export function normalizeText(s: string): string {
  return cleanText(s);
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

/** A wire-agency dateline: "Doha, November 18 (QNA) - ", "Riyadh, Nov 3 (SPA) –". */
export const AGENCY_DATELINE =
  /(?<![\p{L}\p{N}])[\p{Lu}][\p{L} .'-]{1,40},\s+[\p{Lu}][\p{L}.]+\s+\d{1,2}\s*\((?:QNA|WAM|SPA|KUNA|BNA|ONA)\)\s*[-–—]?\s*/gu;

/**
 * Remove wire-agency datelines. A dateline says where the agency filed from,
 * not what the story is about — every QNA summary starts "Doha, <date> (QNA) -",
 * so leaving it in made unrelated stories look alike to the clusterer and made
 * every one "name Qatar" for the editorial exclusions.
 */
export function stripDateline(text: string): string {
  return text.replace(AGENCY_DATELINE, " ").trim();
}
