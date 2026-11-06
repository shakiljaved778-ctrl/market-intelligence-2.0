/**
 * Near-duplicate guard (Phase 2 §2). A second line of defence after clustering:
 * before a new story is published it is compared against same-section stories
 * from the last 72h; a near-duplicate is merged into the existing cluster (source
 * count + dateModified bumped) rather than published as a fresh card.
 *
 * Model-free: normalised-title token Jaccard (the deterministic path that works
 * with the offline HashEmbedder, per CLAUDE.md §9). When real embeddings are
 * available the caller can gate on cosine ~0.82 as well; this module is the
 * always-on floor.
 */

const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "to",
  "of",
  "in",
  "on",
  "for",
  "and",
  "as",
  "at",
  "by",
  "with",
  "from",
  "after",
  "amid",
  "over",
  "its",
  "it",
  "is",
  "are",
  "be",
  "that",
  "this",
  "new",
  "says",
  "say",
  "will",
  "has",
  "have",
  "up",
  "down",
]);

/** Lowercased, punctuation-stripped, stopword-free token set of a title. */
export function titleTokens(title: string): Set<string> {
  const tokens = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
  return new Set(tokens);
}

/** Jaccard overlap of two token sets: |A∩B| / |A∪B|. */
export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function titleSimilarity(a: string, b: string): number {
  return jaccard(titleTokens(a), titleTokens(b));
}

/** Default Jaccard threshold. Lower than an embeddings cosine (~0.82) because
 *  normalised titles share fewer tokens than paraphrases share meaning. */
export const DEFAULT_JACCARD_THRESHOLD = 0.5;

export interface DedupeCandidate {
  title: string;
  section: string;
  publishedAt: string; // ISO
}

export interface DedupeOptions {
  windowHours?: number; // default 72
  threshold?: number; // default 0.5
  now?: number; // injectable clock (ms)
}

export function isNearDuplicate(
  a: string,
  b: string,
  threshold: number = DEFAULT_JACCARD_THRESHOLD,
): boolean {
  return titleSimilarity(a, b) >= threshold;
}

/**
 * Finds the first existing story that `candidate` duplicates: same section, within
 * the window, title similarity at/above threshold. Returns it (to merge into) or
 * null (publish as new).
 */
export function findDuplicate(
  candidate: DedupeCandidate,
  existing: readonly DedupeCandidate[],
  opts: DedupeOptions = {},
): DedupeCandidate | null {
  const windowMs = (opts.windowHours ?? 72) * 3600 * 1000;
  const threshold = opts.threshold ?? DEFAULT_JACCARD_THRESHOLD;
  const now = opts.now ?? Date.now();
  const candTokens = titleTokens(candidate.title);

  for (const e of existing) {
    if (e.section !== candidate.section) continue;
    const age = now - Date.parse(e.publishedAt);
    if (!(age >= 0) || age > windowMs) continue;
    if (jaccard(candTokens, titleTokens(e.title)) >= threshold) return e;
  }
  return null;
}
