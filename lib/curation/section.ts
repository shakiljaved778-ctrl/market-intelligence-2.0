import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import { loadSources } from "./config";

/**
 * Sections (§9, §13) — the top-level editorial verticals. Assignment is
 * DETERMINISTIC and rule-driven: a reviewable rule file (content/sections.yaml)
 * you can inspect and fix beats a model you can't. No LLM.
 *
 * How a story is placed (Phase 2 rewrite):
 *
 *  1. SCORE every section. A keyword in the headline is worth more than one in
 *     the description; instruments and topics add to the financial sections.
 *     The highest score wins — not the first rule to match.
 *  2. Keywords with a capital letter (WHO, NASA, Mars) match case-sensitively,
 *     so the acronym WHO never matches the word "who".
 *  3. The SOURCE constrains the answer. A feed can declare the sections it may
 *     publish into (`allowed_sections`) and a `default_section`: a NASA release
 *     can only ever be Science or Tech, whatever words it contains.
 *  4. A story nothing can place goes to the hidden "general" bucket — never to
 *     Markets by default.
 *
 * These rules exist because the old first-match classifier filed NASA stories
 * under Markets (the default) and Health (the keyword "who").
 */
const CONTENT_DIR = join(process.cwd(), "content");

const SectionSchema = z.object({
  id: z.string(),
  label: z.string(),
  blurb: z.string(),
  financial: z.boolean(),
  /** Hidden sections exist for routing only: never in navigation or on the homepage. */
  hidden: z.boolean().default(false),
  hue: z.string(),
  glyph: z.string(),
  keywords: z.array(z.string()).default([]),
});
export type SectionConfig = z.infer<typeof SectionSchema>;

let cache: SectionConfig[] | null = null;

export function loadSections(): SectionConfig[] {
  if (cache) return cache;
  const raw = parse(readFileSync(join(CONTENT_DIR, "sections.yaml"), "utf8")) as {
    sections?: unknown;
  };
  cache = z.array(SectionSchema).parse(raw.sections ?? []);
  return cache;
}

/** Sections shown in navigation, on the homepage and on the sections page. */
export function visibleSections(): SectionConfig[] {
  return loadSections().filter((s) => !s.hidden);
}

/** Reset the caches (tests). */
export function __resetSectionCache(): void {
  cache = null;
  sourceRules = null;
}

/** Where a story goes when no rule and no source can place it. */
export const UNPLACED_SECTION = "general";

/** Topics that indicate the macro/economy vertical rather than instrument news. */
const ECONOMY_TOPICS = new Set(["monetary_policy", "inflation", "employment"]);

// Scoring weights — one place, named.
export const W_TITLE = 3; // keyword in the headline
export const W_DEK = 1; // keyword in the description only
export const W_ECONOMY_TOPIC = 4; // a macro topic was detected
export const W_CRYPTO_TOPIC = 4;
export const W_TICKER = 3; // the story names a listed instrument
export const W_FINANCIAL_TOPIC = 2; // earnings, energy, regulation …

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const matcherCache = new Map<string, RegExp>();

/**
 * Whole-token keyword match. A keyword containing a capital letter is matched
 * case-sensitively (acronyms and proper nouns); an all-lower-case keyword
 * matches in any case.
 */
export function keywordMatches(text: string, keyword: string): boolean {
  let re = matcherCache.get(keyword);
  if (!re) {
    const caseSensitive = /[A-Z]/.test(keyword);
    re = new RegExp(
      `(^|[^A-Za-z0-9])${escapeRegex(keyword)}([^A-Za-z0-9]|$)`,
      caseSensitive ? "" : "i",
    );
    matcherCache.set(keyword, re);
  }
  return re.test(text);
}

interface SourceRule {
  defaultSection: string | null;
  allowed: string[] | null;
}
let sourceRules: Map<string, SourceRule> | null = null;

function ruleFor(sourceId: string | null | undefined): SourceRule | null {
  if (!sourceId) return null;
  if (!sourceRules) {
    sourceRules = new Map();
    for (const s of loadSources()) {
      if (!s.default_section && !s.allowed_sections) continue;
      sourceRules.set(s.id, {
        defaultSection: s.default_section ?? null,
        allowed: s.allowed_sections ?? null,
      });
    }
  }
  return sourceRules.get(sourceId) ?? null;
}

export interface SectionInput {
  title: string;
  dek?: string | null;
  topics?: string[];
  tickers?: string[];
  /** The id (content/sources.yaml) of the story's primary source, if known. */
  sourceId?: string | null;
}

/** Per-section scores for a story — exported so tests and tools can explain a placement. */
export function scoreSections(input: SectionInput): Map<string, number> {
  const title = input.title;
  const dek = input.dek ?? "";
  const topics = input.topics ?? [];
  const tickers = input.tickers ?? [];
  const scores = new Map<string, number>();
  const add = (id: string, n: number) => scores.set(id, (scores.get(id) ?? 0) + n);

  for (const s of loadSections()) {
    for (const k of s.keywords) {
      if (keywordMatches(title, k)) add(s.id, W_TITLE);
      else if (dek && keywordMatches(dek, k)) add(s.id, W_DEK);
    }
  }
  if (topics.some((t) => ECONOMY_TOPICS.has(t))) add("economy", W_ECONOMY_TOPIC);
  if (topics.includes("crypto")) add("crypto", W_CRYPTO_TOPIC);
  if (tickers.length > 0) add("markets", W_TICKER);
  if (topics.some((t) => !ECONOMY_TOPICS.has(t) && t !== "crypto" && t !== "gcc")) {
    add("markets", W_FINANCIAL_TOPIC);
  }
  return scores;
}

/**
 * Deterministic section assignment — see the file header for the rules.
 * Ties are broken in favour of the non-financial section (a genuine tech or
 * science story is not swallowed by Markets because it names a company), then
 * by file order.
 */
export function classifySection(input: SectionInput): string {
  const sections = loadSections();
  const scores = scoreSections(input);
  const rule = ruleFor(input.sourceId);

  const candidates = sections.filter(
    (s) => !s.hidden && (!rule?.allowed || rule.allowed.includes(s.id)),
  );

  let best: SectionConfig | null = null;
  let bestScore = 0;
  for (const s of candidates) {
    const score = scores.get(s.id) ?? 0;
    if (score <= 0) continue;
    const better =
      score > bestScore ||
      (score === bestScore && best !== null && best.financial && !s.financial);
    if (better) {
      best = s;
      bestScore = score;
    }
  }
  if (best) return best.id;
  if (rule?.defaultSection) return rule.defaultSection;
  // A constrained source with no default falls to its first allowed section.
  if (rule?.allowed?.[0]) return rule.allowed[0];
  return UNPLACED_SECTION;
}

/** Look up a section's metadata by id, falling back to the unplaced bucket. */
export function sectionMeta(id: string): SectionConfig {
  const sections = loadSections();
  return (
    sections.find((s) => s.id === id) ??
    sections.find((s) => s.id === UNPLACED_SECTION) ??
    sections[0]!
  );
}

export function isFinancialSection(id: string): boolean {
  return sectionMeta(id).financial;
}
