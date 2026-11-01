import { classify } from "./classify";

/**
 * Editorial quality gate (Phase 2 §3–§4). Deterministic, model-free — it decides
 * whether a story is specific and well-sourced enough to publish, and flags raw
 * institutional titles for the summariser to rewrite. No LLM here: this gate runs
 * in the ingest/cluster pipeline before anything is published.
 *
 * Checks:
 *  - the headline names something specific (a number, a known ticker/entity, or a
 *    proper noun that isn't a generic headline opener) — rejects seed-style
 *    headlines like "Voters head to the polls in a pivotal national election";
 *  - a raw institutional title ("Minutes of the Meeting…", "Monetary policy
 *    decisions") is flagged for a factual rewrite;
 *  - a summary (when present) is >= 40 words and every number in it appears in a
 *    cited source — no invented figures.
 */

export const MIN_SUMMARY_WORDS = 40;

/** Generic words that commonly open an empty headline — a capitalised one of
 *  these does not count as "naming something specific". */
const GENERIC_OPENERS = new Set([
  "a",
  "an",
  "the",
  "historic",
  "major",
  "new",
  "global",
  "national",
  "breaking",
  "voters",
  "leaders",
  "officials",
  "authorities",
  "markets",
  "stocks",
  "shares",
  "investors",
  "analysts",
  "experts",
  "sources",
  "report",
  "reports",
  "update",
  "live",
]);

/** Normalised numeric tokens in a text: "3", "3.5", "2000" (from "2,000"), "25". */
export function numbersIn(text: string): string[] {
  const matches = text.match(/\d[\d.,]*\d|\d/g) ?? [];
  return matches.map((m) => m.replace(/,/g, "").replace(/\.$/, ""));
}

/** Does the headline name something specific (number, ticker/entity, proper noun)? */
export function hasSpecificEntity(headline: string): boolean {
  if (/\d/.test(headline)) return true;
  const { tickers, entities } = classify(headline, null);
  if (tickers.length > 0 || entities.length > 0) return true;
  for (const raw of headline.split(/\s+/)) {
    const t = raw.replace(/[^A-Za-z]/g, "");
    // A capitalised proper noun (initial cap + a lowercase letter) that isn't a
    // generic opener — e.g. "Apple", "Fed", "OpenAI" — counts as specific.
    if (/^[A-Z][a-z]/.test(t) && !GENERIC_OPENERS.has(t.toLowerCase())) return true;
  }
  return false;
}

const INSTITUTIONAL_PATTERNS: RegExp[] = [
  /^minutes of the meeting/i,
  /^monetary policy (decision|decisions|statement)/i,
  /\b(fomc|mpc)\b.*\b(statement|minutes|decision)/i,
  /\bissues?\b.*\b(statement|minutes)/i,
  /^statement (on|by|from)\b/i,
  /^(summary of )?(survey|poll) results?$/i,
];

/** A raw document-style title that should be rewritten into a factual headline. */
export function isInstitutionalTitle(title: string): boolean {
  return INSTITUTIONAL_PATTERNS.some((re) => re.test(title.trim()));
}

export interface QualityInput {
  headline: string;
  /** The AI/editorial summary, when one exists (live stories). */
  summary?: string | null;
  /** Source texts (headline/dek/primary excerpts) the summary's numbers must come from. */
  sources?: string[];
}

export interface QualityResult {
  ok: boolean;
  /** Machine-readable reasons; empty when the story passes. */
  reasons: string[];
  /** True when the headline is a raw institutional title to rewrite (not a hard fail). */
  needsRewrite: boolean;
}

export function evaluateQuality(input: QualityInput): QualityResult {
  const reasons: string[] = [];
  const needsRewrite = isInstitutionalTitle(input.headline);

  if (!hasSpecificEntity(input.headline) && !needsRewrite) {
    reasons.push("headline_lacks_specific_entity");
  }

  const summary = (input.summary ?? "").trim();
  if (summary.length > 0) {
    const words = summary.split(/\s+/).filter(Boolean).length;
    if (words < MIN_SUMMARY_WORDS) reasons.push("summary_too_short");

    const sourceNumbers = new Set((input.sources ?? []).flatMap(numbersIn));
    const unsupported = [...new Set(numbersIn(summary))].filter(
      (n) => !sourceNumbers.has(n),
    );
    if (unsupported.length > 0) {
      reasons.push(`unsupported_numbers:${unsupported.join(",")}`);
    }
  }

  return { ok: reasons.length === 0, reasons, needsRewrite };
}
