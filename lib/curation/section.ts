import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import { mentions } from "./classify";

/**
 * Sections (§9, §13) — the top-level editorial verticals. Assignment is
 * DETERMINISTIC and keyword-driven, exactly like topics/entities: a reviewable
 * rule file (content/sections.yaml) you can inspect and fix beats a model you
 * can't. No LLM, consistent with the V1 invariant.
 *
 * A section is derived from a cluster's title + dek + topics + tickers. The
 * product rule is that markets/economy dominate but at least ~30% of the wire is
 * deliberately non-financial to keep a broad audience engaged; that ratio is
 * guarded by section.test.ts.
 */
const CONTENT_DIR = join(process.cwd(), "content");

const SectionSchema = z.object({
  id: z.string(),
  label: z.string(),
  blurb: z.string(),
  financial: z.boolean(),
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

/** Reset the cache (tests). */
export function __resetSectionCache(): void {
  cache = null;
}

/** Fallback section when nothing else matches — Mizan is markets-first. */
export const DEFAULT_SECTION = "markets";

/** Topics that indicate the macro/economy vertical rather than instrument news. */
const ECONOMY_TOPICS = new Set(["monetary_policy", "inflation", "employment"]);

export interface SectionInput {
  title: string;
  dek?: string | null;
  topics?: string[];
  tickers?: string[];
}

/**
 * Deterministic section assignment. Priority:
 *   1. An explicit NON-FINANCIAL keyword match wins (in file order) — a genuine
 *      tech/health/sports/culture/science story is never buried under markets.
 *   2. A macro/economy topic → economy.
 *   3. Any instrument or financial topic present → markets.
 *   4. A financial-section keyword match (in file order).
 *   5. Default to markets.
 */
export function classifySection(input: SectionInput): string {
  const text = `${input.title} ${input.dek ?? ""}`;
  const topics = input.topics ?? [];
  const tickers = input.tickers ?? [];
  const sections = loadSections();

  for (const s of sections) {
    if (s.financial) continue;
    if (s.keywords.some((k) => mentions(text, k))) return s.id;
  }

  if (topics.some((t) => ECONOMY_TOPICS.has(t))) return "economy";

  if (tickers.length > 0 || topics.length > 0) return DEFAULT_SECTION;

  for (const s of sections) {
    if (!s.financial) continue;
    if (s.keywords.some((k) => mentions(text, k))) return s.id;
  }

  return DEFAULT_SECTION;
}

/** Look up a section's metadata by id, falling back to markets. */
export function sectionMeta(id: string): SectionConfig {
  const sections = loadSections();
  return sections.find((s) => s.id === id) ?? sections[0]!;
}

export function isFinancialSection(id: string): boolean {
  return sectionMeta(id).financial;
}
