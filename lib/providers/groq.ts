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
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

export interface BriefInput {
  title: string;
  dek?: string | null;
  section: string;
  tickers?: string[];
  sources?: string[];
  /** ticker -> latest % move, for grounding the "market response" line. */
  moves?: Record<string, number>;
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
  return [
    `Headline: ${input.title}`,
    input.dek ? `Summary: ${input.dek}` : "",
    input.tickers?.length ? `Instruments: ${input.tickers.join(", ")}` : "",
    moves ? `Latest moves: ${moves}` : "",
    input.sources?.length ? `Reported by: ${input.sources.join(", ")}` : "",
    `Section: ${input.section}`,
  ]
    .filter(Boolean)
    .join("\n");
}

const SYSTEM = [
  "You are a markets news editor writing ORIGINAL briefs for an intelligence site.",
  "Write 150-210 words in 2-3 short paragraphs, neutral and factual.",
  "Do NOT copy or paraphrase sentences from any source; synthesise from the facts given.",
  "Ground any market figures only in the numbers provided; never invent prices.",
  "End with a final line that starts with '**Why it matters:**' (one sentence).",
  "No investment advice, no hype, no first person.",
].join(" ");

/**
 * Generate an original brief for a story. Cached by a stable key so a story is
 * generated once. Returns null when unconfigured or on any failure.
 */
export async function generateBrief(
  key: string,
  input: BriefInput,
): Promise<Brief | null> {
  if (!isGroqConfigured()) return null;
  const model = process.env.GROQ_MODEL || DEFAULT_MODEL;
  try {
    const { value } = await swr<Brief | null>(
      `brief:${model}:${key}`,
      TTL.fundamentals,
      async () => {
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
            max_tokens: 400,
            messages: [
              { role: "system", content: SYSTEM },
              { role: "user", content: prompt(input) },
            ],
          }),
        });
        if (!res.ok) throw new Error(`Groq ${res.status}`);
        const parsed = Completion.parse(await res.json());
        const body = parsed.choices[0]!.message.content.trim();
        if (!body) return null;
        return { body, model };
      },
    );
    return value;
  } catch {
    return null;
  }
}
