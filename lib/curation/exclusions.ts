import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { z } from "zod";

/**
 * Editorial exclusions (owner decision, 2026-11-19): no news about the Qatar
 * Central Bank, and nothing about Qatar politics, government or diplomacy.
 * The terms live in the reviewable rule file `content/exclusions.yaml`; this is
 * the deterministic matcher every stage uses (ingest, cluster job, read layer,
 * AI-article check). No model.
 */
const ExclusionSchema = z.object({
  always: z.array(z.string().min(1)),
  qatar_markers: z.array(z.string().min(1)),
  qatar_politics: z.array(z.string().min(1)),
  qatar_politics_text: z.array(z.string().min(1)),
  minister_meeting_verbs: z.array(z.string().min(1)),
});
export type ExclusionRules = z.infer<typeof ExclusionSchema>;

export function loadExclusions(): ExclusionRules {
  const raw = parse(
    readFileSync(join(process.cwd(), "content", "exclusions.yaml"), "utf8"),
  ) as unknown;
  return ExclusionSchema.parse(raw);
}

function escape(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
}

/** One case-insensitive regex matching any of `terms` as a whole word/phrase.
 * Word edges are any non-letter/digit, so it works for Arabic as well. */
function anyOf(terms: string[]): RegExp {
  const alt = [...terms]
    .sort((a, b) => b.length - a.length)
    .map(escape)
    .join("|");
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${alt})(?![\\p{L}\\p{N}])`, "iu");
}

interface Compiled {
  always: RegExp;
  qatar: RegExp;
  politics: RegExp;
  politicsText: RegExp;
  minister: RegExp;
  meetingVerb: RegExp;
}

function compile(rules: ExclusionRules): Compiled {
  return {
    always: anyOf(rules.always),
    qatar: anyOf(rules.qatar_markers),
    politics: anyOf(rules.qatar_politics),
    politicsText: anyOf(rules.qatar_politics_text),
    minister: /(?<![\p{L}\p{N}])minist(?:er|ers|ry|ries)(?![\p{L}\p{N}])/iu,
    meetingVerb: anyOf(rules.minister_meeting_verbs),
  };
}

let compiled: Compiled | null = null;
function rules(): Compiled {
  compiled ??= compile(loadExclusions());
  return compiled;
}

export interface ExclusionInput {
  /** Headline, dek and any other text describing the story. */
  texts: (string | null | undefined)[];
  /** Region of the story's source in content/sources.yaml (e.g. "QA"), if any. */
  sourceRegion?: string | null;
}

export interface ExclusionVerdict {
  excluded: boolean;
  /** Why, for the job log: "qcb: QCB" or "qatar-politics: Prime Minister". */
  reason?: string;
}

/**
 * Whether a story falls under the exclusions. `always` terms exclude it
 * outright; government and diplomacy terms (and a minister meeting someone)
 * exclude it when it is Qatar-related — the text names Qatar, or the source is
 * a Qatar feed; general political words exclude it only when the text itself
 * names Qatar.
 */
export function checkExclusion(
  input: ExclusionInput,
  r: Compiled = rules(),
): ExclusionVerdict {
  const text = input.texts.filter(Boolean).join("\n");
  const qcb = text.match(r.always);
  if (qcb) return { excluded: true, reason: `qcb: ${qcb[0]}` };

  const namesQatar = r.qatar.test(text);
  const qatarRelated = namesQatar || input.sourceRegion === "QA";
  if (!qatarRelated) return { excluded: false };

  const political = text.match(r.politics);
  if (political) return { excluded: true, reason: `qatar-politics: ${political[0]}` };
  if (namesQatar) {
    const word = text.match(r.politicsText);
    if (word) return { excluded: true, reason: `qatar-politics: ${word[0]}` };
  }
  if (r.minister.test(text)) {
    const verb = text.match(r.meetingVerb);
    if (verb) return { excluded: true, reason: `qatar-politics: minister ${verb[0]}` };
  }
  return { excluded: false };
}

export function isExcluded(input: ExclusionInput): boolean {
  return checkExclusion(input).excluded;
}

/** Banned terms an AI article mentions (always-terms only: a brief about a
 * permitted story may still say "prime minister" of another country). */
export function excludedTermsIn(body: string): string[] {
  const g = new RegExp(rules().always.source, "giu");
  return [...new Set([...body.matchAll(g)].map((m) => m[0]))];
}

/** For tests: compile a rule set without reading the file. */
export const __compileExclusions = compile;
