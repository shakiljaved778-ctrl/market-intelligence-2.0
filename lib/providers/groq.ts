import { z } from "zod";
import { swr } from "@/lib/cache/swr";
import { TTL } from "@/lib/cache/ttl";

/**
 * Groq — hosted LLM used to generate ORIGINAL article bodies from a story's
 * facts (headline, dek, sources, instruments, moves). The ONLY place a Groq
 * fetch may target the vendor.
 *
 * Charter note: the V1 "no LLM" rule was lifted by the product owner — Mizan now
 * ships AI-assisted summaries. Guardrails that remain in force:
 *   - We generate ORIGINAL prose; we never copy source article bodies (§10).
 *   - Every generated body cites its sources and carries an AI + not-advice
 *     disclaimer in the UI.
 *   - Generation runs in scheduled jobs / a script and is CACHED (§2); pages are
 *     served from the cache/store, never blocked on a model call at render.
 *   - No key → returns null and the UI falls back to the dek + source list.
 */
const BASE_URL = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Candidate models, tried in order until one is accepted (Groq retires model
 * IDs over time, so a single hard-coded name goes stale). `GROQ_MODEL` (when
 * set) is tried first. The first model that returns a completion is remembered
 * for the rest of the process so we don't re-probe dead names per story.
 */
const FALLBACK_MODELS = [
  // Largest first: it follows the accuracy rules most reliably (the 20b model
  // invented background facts, 14 Nov). Retired IDs are skipped automatically.
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
];

function candidateModels(): string[] {
  const preferred = process.env.GROQ_MODEL?.trim();
  return [...new Set([preferred, ...FALLBACK_MODELS].filter(Boolean) as string[])];
}

// Remembered working model for this process (reset each job run).
let resolvedModel: string | null = null;

export interface BriefInput {
  title: string;
  dek?: string | null;
  section: string;
  tickers?: string[];
  sources?: string[];
  /** ticker -> latest % move, for grounding the "market response" line. */
  moves?: Record<string, number>;
  /** When the story was published (ISO), so dates can be grounded. */
  publishedAt?: string;
  /** Deks from every clustered report — more cited facts to synthesise from,
   * so multi-source stories get a full, grounded article. */
  sourceDeks?: string[];
}

export interface Brief {
  body: string; // markdown, our original content
  model: string;
}

const Completion = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string() }) })).min(1),
});

export function isGroqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

function prompt(input: BriefInput): string {
  const moves = input.moves
    ? Object.entries(input.moves)
        .map(([s, m]) => `${s} ${m >= 0 ? "+" : ""}${m.toFixed(2)}%`)
        .join(", ")
    : "";
  // De-duplicate the cited deks (drop one identical to the headline/summary).
  const seen = new Set([
    input.title.trim().toLowerCase(),
    input.dek?.trim().toLowerCase(),
  ]);
  const details = (input.sourceDeks ?? [])
    .map((d) => d.trim())
    .filter((d) => d && !seen.has(d.toLowerCase()))
    .slice(0, 8);
  return [
    `Headline: ${input.title}`,
    input.dek ? `Summary: ${input.dek}` : "",
    details.length
      ? `Reported facts (synthesise, do not copy):\n- ${details.join("\n- ")}`
      : "",
    input.tickers?.length ? `Instruments: ${input.tickers.join(", ")}` : "",
    moves ? `Latest moves: ${moves}` : "",
    input.sources?.length ? `Reported by: ${input.sources.join(", ")}` : "",
    input.publishedAt ? `Published: ${input.publishedAt.slice(0, 10)}` : "",
    `Section: ${input.section}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Target length of a brief (owner request, 2026-11-14: fuller articles). */
export const BRIEF_TARGET_WORDS = { min: 400, max: 550 } as const;
/** A stored brief shorter than this is rewritten by the cluster job. */
export const BRIEF_MIN_WORDS = 300;
/**
 * Version of the article rules, stored with each article's model name. The
 * cluster job rewrites articles written under older rules (v3: tightened
 * background rules and the figure check, 2026-11-14).
 */
export const BRIEF_FORMAT = "v3";

export function wordCount(text: string): number {
  return text.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
}

/** Numbers in a text, normalised ("1,234.50" -> "1234.5", "05" -> "5"). */
function figures(text: string): string[] {
  return (text.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => {
    const v = n.replace(/,/g, "");
    return v.includes(".")
      ? v.replace(/0+$/, "").replace(/\.$/, "")
      : String(Number(v));
  });
}

/** Every figure the model was given: headline, summaries, moves and date. */
function factsText(input: BriefInput): string {
  const moves = Object.entries(input.moves ?? {})
    .map(([s, m]) => `${s} ${m.toFixed(2)}`)
    .join(" ");
  return [
    input.title,
    input.dek ?? "",
    ...(input.sourceDeks ?? []),
    ...(input.tickers ?? []),
    ...(input.sources ?? []),
    moves,
    input.publishedAt?.slice(0, 10) ?? "",
  ].join(" ");
}

/**
 * Figures in a generated article that do not appear in the facts it was given.
 * Deterministic guard against invented numbers (§17: never a fabricated figure).
 */
export function ungroundedFigures(body: string, input: BriefInput): string[] {
  const allowed = new Set(figures(factsText(input)));
  return [...new Set(figures(body).filter((f) => !allowed.has(f)))];
}

const SYSTEM = [
  "You are a markets news editor writing ORIGINAL articles for a GCC and global market intelligence site.",
  `Write ${BRIEF_TARGET_WORDS.min}-${BRIEF_TARGET_WORDS.max} words, neutral and factual, in this structure:`,
  "an opening paragraph of two or three sentences saying what happened, with no heading;",
  "then sections, each starting with a line of the form '## Heading' followed by one or two paragraphs:",
  "'## The details' (everything the reported facts establish, without repeating the opening);",
  "'## Market context' (ONLY if instruments or moves are given; use those numbers exactly; otherwise omit this section);",
  "'## Background' (explain in general terms what the words and kinds of institution named in the facts mean);",
  "'## What to watch' (only next steps the facts themselves mention; if they mention none, say in one sentence what the facts leave open).",
  "End with a final line that starts with '**Why it matters:**' (one sentence).",
  "Accuracy rules, which outrank length: every name, number, date, quote and event must come from the facts given.",
  "In Background and What to watch never state which organisations anyone belongs to, how often anything happens, which ministry or body is responsible, history, rankings, forecasts or dates — unless the facts say so.",
  "Use no number that is not in the facts; never compute new figures, prices or percentages.",
  "Refer to sources by the names given under 'Reported by'.",
  "If the facts are thin, keep each section short rather than pad it.",
  "Do NOT copy or closely paraphrase sentences from any source; synthesise in your own words.",
  "No investment advice, no buy/sell/hold language, no hype, no first person, no bullet lists.",
].join(" ");

/**
 * Generate an original brief for a story. Cached by a stable key so a story is
 * generated once. Returns null when unconfigured or on any failure.
 */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Minimum gap between calls. The free tier allows about 8,000 tokens a minute
 * and one article costs about 2,300 (prompt, reasoning and text), so calls are
 * spaced rather than fired back to back into rate-limit errors.
 */
let minIntervalMs = 20_000;
let lastCallAt = 0;
/** Tests only. */
export function __setGroqPacing(ms: number): void {
  minIntervalMs = ms;
  lastCallAt = 0;
}

async function callGroq(
  model: string,
  input: BriefInput,
  retried = false,
  correction?: string,
): Promise<Brief> {
  const wait = lastCallAt + minIntervalMs - Date.now();
  if (wait > 0) await sleep(wait);
  lastCallAt = Date.now();
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY as string}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      model,
      temperature: 0.4,
      // Headroom for reasoning models (e.g. gpt-oss): the ~800-token article
      // plus the reasoning pass. Too small a budget yields empty content.
      max_tokens: 3000,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: prompt(input) },
        ...(correction ? [{ role: "user", content: correction }] : []),
      ],
    }),
  });
  if (res.status === 429 && !retried) {
    // Free-tier rate limit: wait as asked (capped) and try once more.
    const after = Number(res.headers.get("retry-after"));
    await sleep(
      Math.min(Number.isFinite(after) && after > 0 ? after * 1000 : 10_000, 30_000),
    );
    return callGroq(model, input, true, correction);
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Groq ${res.status} (model=${model}): ${detail.slice(0, 300)}`);
  }
  const parsed = Completion.parse(await res.json());
  const body = parsed.choices[0]!.message.content.trim();
  if (!body) throw new Error(`Groq returned empty content (model=${model})`);
  return { body, model };
}

const MODEL_UNAVAILABLE = /404|model_not_found|does not exist|decommission|deprecat/i;

/**
 * Generate an original brief for a story. Tries candidate models until one is
 * accepted (remembering the winner for the rest of the run), and returns null
 * when unconfigured or if every candidate fails. Cached by a model-independent
 * key so a story is generated once where KV is present.
 */
export async function generateBrief(
  key: string,
  input: BriefInput,
): Promise<Brief | null> {
  if (!isGroqConfigured()) return null;
  try {
    const { value } = await swr<Brief | null>(
      // v3: sectioned format with the figure check (2026-11-14).
      `brief:v3:${key}`,
      TTL.fundamentals,
      async () => {
        const models = resolvedModel ? [resolvedModel] : candidateModels();
        for (const model of models) {
          try {
            let brief = await callGroq(model, input);
            let bad = ungroundedFigures(brief.body, input);
            if (bad.length) {
              // One rewrite, told exactly which figures were not in the facts.
              brief = await callGroq(
                model,
                input,
                false,
                `Your draft used figures that are not in the facts: ${bad.join(", ")}. Rewrite it using only figures that appear in the facts.`,
              );
              bad = ungroundedFigures(brief.body, input);
              if (bad.length) {
                throw new Error(`ungrounded figures after rewrite: ${bad.join(", ")}`);
              }
            }
            if (resolvedModel !== model) {
              resolvedModel = model;
              console.log(`[groq] using model ${model}`);
            }
            return brief;
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (MODEL_UNAVAILABLE.test(msg) && models.length > 1) {
              console.warn(`[groq] model ${model} unavailable, trying next`);
              continue;
            }
            throw err;
          }
        }
        return null;
      },
    );
    return value;
  } catch (err) {
    // Diagnostics for the scheduled job — the caller still degrades gracefully.
    console.warn("[groq] brief failed:", err instanceof Error ? err.message : err);
    return null;
  }
}
