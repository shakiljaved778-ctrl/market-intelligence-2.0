import { z } from "zod";
import { swr } from "@/lib/cache/swr";
import { TTL } from "@/lib/cache/ttl";
import { checkExclusion, excludedTermsIn } from "@/lib/curation/exclusions";

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

/**
 * The models to try for one piece, in order: the one that last worked first,
 * then the rest, skipping any whose daily allowance is spent (2026-11-28).
 * Groq's free-tier daily token limit is PER MODEL: when gpt-oss-120b ran out,
 * every article and the Mizaan Original stopped for the day although the other
 * models' allowances were untouched. Every draft still passes the same figure,
 * name, exclusion and forecast checks whichever model wrote it.
 */
function modelsToTry(now = Date.now()): string[] {
  const all = candidateModels();
  const ordered =
    resolvedModel && all.includes(resolvedModel)
      ? [resolvedModel, ...all.filter((m) => m !== resolvedModel)]
      : all;
  return ordered.filter((m) => !groqDailyLimitReached(now, m));
}

/** An error that means "try the next model", not "give up". */
const TRY_NEXT_MODEL =
  /404|model_not_found|does not exist|decommission|deprecat|daily token limit/i;

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
 * cluster job rewrites articles written under older rules (v4: tightened
 * background rules, figure and institution-name checks, 2026-11-14).
 */
export const BRIEF_FORMAT = "v4";

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

// "Ministry of Oil" first; then "Financial Markets Authority" in what remains.
const INSTITUTION_OF =
  /\b(?:Ministry|Department|Authority|Agency|Commission|Directorate)\s+of\s+(?:the\s+)?[A-Z][\w'-]*(?:\s+(?:and\s+|&\s+)?[A-Z][\w'-]*)*/g;
const INSTITUTION_SUFFIX =
  /\b[A-Z][\w'-]*(?:\s+[A-Z][\w'-]*)*\s+(?:Ministry|Authority|Agency|Commission|Directorate)\b/g;
const LEADING = /^(?:(?:The|An?|Omani|Qatari|Saudi|Emirati|Kuwaiti|Bahraini)\s+)+/;

/**
 * Named ministries, authorities and agencies in a generated article that the
 * facts never mention — the model has been seen inventing them ("the Omani
 * Ministry of Oil"). Matched case-insensitively against the facts.
 */
export function ungroundedInstitutions(body: string, input: BriefInput): string[] {
  const facts = factsText(input).toLowerCase();
  const ofForm = body.match(INSTITUTION_OF) ?? [];
  const rest = body.replace(INSTITUTION_OF, " ");
  const suffixForm = (rest.match(INSTITUTION_SUFFIX) ?? []).map((n) =>
    n.replace(LEADING, ""),
  );
  return [
    ...new Set(
      [...ofForm, ...suffixForm]
        .map((n) => n.trim())
        .filter((n) => /\s/.test(n) && !facts.includes(n.toLowerCase())),
    ),
  ];
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
  "For Qatar, cover markets and the economy only: never mention Qatar's politics, government, ministers, officials, diplomacy, foreign relations, elections or geopolitics, and avoid political words (political, geopolitical, sanctions, summit, military) anywhere in the piece.",
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
  system: string = SYSTEM,
  user: string = prompt(input),
  maxTokens = 3000,
): Promise<Brief> {
  if (groqDailyLimitReached(Date.now(), model)) {
    throw new Error(
      `Groq daily token limit reached (model=${model}); skipping until it resets`,
    );
  }
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
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
        ...(correction ? [{ role: "user", content: correction }] : []),
      ],
    }),
  });
  if (res.status === 429) {
    // The free tier's DAILY token allowance is spent: waiting cannot help, so
    // stop calling until it resets (owner's runs slowed by ~50 s per story).
    const detail = await res
      .clone()
      .text()
      .catch(() => "");
    if (/tokens per day|\(TPD\)/i.test(detail)) {
      const m = /try again in (?:(\d+)h)?(?:(\d+)m)?([\d.]+)?s?/i.exec(detail);
      const ms =
        m && (m[1] || m[2] || m[3])
          ? ((Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0)) * 60 + Number(m[3] ?? 0)) *
            1000
          : 15 * 60_000;
      // A message we cannot parse ("in 2h3m." parses as NaN) waits 15 minutes.
      const wait = Number.isFinite(ms) ? Math.max(ms, 60_000) : 15 * 60_000;
      dailyLimitUntil.set(model, Date.now() + wait);
      throw new Error(`Groq daily token limit reached (model=${model})`);
    }
  }
  if (res.status === 429 && !retried) {
    // Free-tier rate limit: wait as asked (capped) and try once more.
    const after = Number(res.headers.get("retry-after"));
    await sleep(
      Math.min(Number.isFinite(after) && after > 0 ? after * 1000 : 10_000, 30_000),
    );
    return callGroq(model, input, true, correction, system, user, maxTokens);
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

const dailyLimitUntil = new Map<string, number>();
/**
 * True while the free tier's daily token allowance is spent (this process):
 * for `model`, or with no model, for EVERY candidate model.
 */
export function groqDailyLimitReached(now = Date.now(), model?: string): boolean {
  if (model) return now < (dailyLimitUntil.get(model) ?? 0);
  return candidateModels().every((m) => now < (dailyLimitUntil.get(m) ?? 0));
}
/** For tests: set the limit for every candidate model (or one). */
export function __setGroqDailyLimitUntil(t: number, model?: string): void {
  for (const m of model ? [model] : candidateModels()) dailyLimitUntil.set(m, t);
}

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
      // v4: sectioned format with the figure and name checks (2026-11-14).
      `brief:v4:${key}`,
      TTL.fundamentals,
      async () => {
        const models = modelsToTry();
        for (const model of models) {
          try {
            const problems = (body: string) => [
              ...ungroundedFigures(body, input).map((f) => `figure ${f}`),
              ...ungroundedInstitutions(body, input).map((n) => `name "${n}"`),
              // Editorial exclusions: never the Qatar Central Bank or Qatar's
              // head of state or government (content/exclusions.yaml).
              ...excludedTermsIn(body).map((t) => `excluded topic "${t}"`),
            ];
            let brief = await callGroq(model, input);
            let bad = problems(brief.body);
            if (bad.length) {
              // One rewrite, told exactly what was not in the facts.
              brief = await callGroq(
                model,
                input,
                false,
                `Your draft used details that are not in the facts: ${bad.join(", ")}. Rewrite it without them, using only what appears in the facts.`,
              );
              bad = problems(brief.body);
              if (bad.length) {
                throw new Error(`ungrounded details after rewrite: ${bad.join(", ")}`);
              }
            }
            if (resolvedModel !== model) {
              resolvedModel = model;
              console.log(`[groq] using model ${model}`);
            }
            return brief;
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (TRY_NEXT_MODEL.test(msg) && models.length > 1) {
              console.warn(`[groq] model ${model} unavailable (${msg}), trying next`);
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

// ---------------------------------------------------------------------------
// Mizaan Original — a broad, AI-written overview of the global markets day
// (owner request, 2026-11-20: the homepage opens with an original lead piece).
// Same guardrails as the briefs: original prose synthesised from cited reports,
// every figure and institution must appear in the facts, editorial exclusions,
// labelled AI-written in the UI, generated only in the scheduled cluster job.
// ---------------------------------------------------------------------------

export interface OriginalReport {
  title: string;
  dek?: string | null;
  source: string;
}

export interface OriginalInput {
  /** The day's top global-markets reports (headline, summary, outlet). */
  reports: OriginalReport[];
  /** The day's top Gulf (GCC) market and economy reports, for the Gulf section. */
  gulfReports?: OriginalReport[];
  /** ticker -> latest % move, for the instruments the reports name. */
  moves?: Record<string, number>;
  /** ISO date the piece is written for. */
  date: string;
}

export interface Original {
  title: string;
  dek: string;
  body: string;
  model: string;
}

export const ORIGINAL_TARGET_WORDS = { min: 600, max: 850 } as const;
/**
 * Version of the Original's rules, stored with its model name. A piece written
 * under older rules is replaced on the next run (o2, 2026-11-20: Gulf reports
 * feed the Gulf section; forecast wording is rejected).
 */
export const ORIGINAL_FORMAT = "o3";

const ORIGINAL_SYSTEM = [
  "You are the lead markets writer of a GCC and global market intelligence site.",
  `Write ONE original, well-crafted overview article of ${ORIGINAL_TARGET_WORDS.min}-${ORIGINAL_TARGET_WORDS.max} words that ties the day's global financial-market reports together into a broad, readable picture.`,
  "Output format, exactly: first line '# ' followed by a headline of at most 12 words;",
  "second line 'Dek: ' followed by one sentence of at most 30 words;",
  "then an opening of two or three paragraphs with no heading, then sections each starting '## Heading' with one or two paragraphs:",
  "'## What moved' , '## The threads that connect them' , '## What it means for the Gulf' (built from the Gulf reports given: what is happening in Gulf markets and economies, and where the global reports touch them; if no Gulf reports are given, say so in one sentence), '## What to watch' (only scheduled events or next steps the reports themselves mention, stated as facts with their source; if the reports name none, say so in one sentence).",
  "End with a final line starting '**The bottom line:**' (one sentence).",
  "Accuracy rules, which outrank length and style: every name, number, date, quote and event must come from the reports given.",
  "Use no number that is not in the reports or the moves; never compute new figures; give moves exactly as listed.",
  "Attribute facts to the outlets named in the reports.",
  "Do NOT copy or closely paraphrase any report; synthesise in your own words.",
  "Describe only what has happened or what the reports say is scheduled; never forecast or speculate. Do not write phrases such as 'will likely', 'is likely to', 'is expected to', 'is set to', 'may well', 'could prompt', 'may lead', 'set the tone', 'will keep an eye on', 'in the weeks ahead', 'in the coming months' or 'going forward' unless a report itself says it, attributed.",
  "Do not claim that one report caused or explains another report's event unless a report says so; connect stories by theme, not invented causes.",
  "No investment advice, no buy/sell/hold language, no hype, no first person, no bullet lists.",
  "For Qatar, cover markets and the economy only: never mention Qatar's politics, government, ministers, officials, diplomacy, foreign relations, elections or geopolitics, and avoid political words (political, geopolitical, sanctions, summit, military) anywhere in the piece.",
].join(" ");

function originalPrompt(input: OriginalInput): string {
  const moves = Object.entries(input.moves ?? {})
    .map(([s, m]) => `${s} ${m >= 0 ? "+" : ""}${m.toFixed(2)}%`)
    .join(", ");
  return [
    `Date: ${input.date.slice(0, 10)}`,
    "Reports (synthesise, do not copy):",
    ...input.reports.map(
      (r, i) => `${i + 1}. ${r.title}${r.dek ? ` — ${r.dek}` : ""} (${r.source})`,
    ),
    input.gulfReports?.length ? "Gulf reports (for the Gulf section):" : "",
    ...(input.gulfReports ?? []).map(
      (r, i) => `G${i + 1}. ${r.title}${r.dek ? ` — ${r.dek}` : ""} (${r.source})`,
    ),
    moves ? `Latest moves: ${moves}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** The reports as a BriefInput, so the brief's grounding checks apply unchanged. */
function originalFacts(input: OriginalInput): BriefInput {
  const all = [...input.reports, ...(input.gulfReports ?? [])];
  return {
    title: all.map((r) => r.title).join(" | "),
    section: "markets",
    sourceDeks: all.map((r) => r.dek ?? "").filter(Boolean),
    sources: [...new Set(all.map((r) => r.source))],
    moves: input.moves,
    publishedAt: input.date,
  };
}

/** Forecast-style phrases an Original must not use unless a report itself does. */
/**
 * Forecast wording the Original may not use unless a report itself does.
 * Patterns cover inflections ("set/sets/setting the tone") and the hedged
 * forecasts the first o2 piece slipped through ("is set to continue", "could
 * channel", "may prompt", "will keep an eye on", "suggesting that … will").
 */
const SPECULATIVE: RegExp[] = [
  /\bwill (?:most )?likely\b/g,
  /\b(?:is|are|seems|seem|looks|look) (?:un)?likely to\b/g,
  /\b(?:is|are) expected to\b/g,
  /\bmay well\b/g,
  /\bset(?:s|ting)? the (?:tone|stage)\b/g,
  /\b(?:is|are) set to\b/g,
  /\b(?:is|are) poised to\b/g,
  /\bpoised to\b/g,
  /\bin the (?:weeks|months|days|year) ahead\b/g,
  /\bin the coming (?:weeks|months|days|quarters|year)\b/g,
  /\bgoing forward\b/g,
  /\b(?:could|may|might) (?:well |also |further )?(?:prompt|channel|offer|signal|drive|lead|weigh|boost|push|spur|fuel|trigger|pressure|lift|support|dampen|accelerate|reshape|test|open|unlock|help|hurt|ease|tighten)\b/g,
  /\bwill (?:keep an eye|be watching|watch|monitor|continue|remain|shape|determine|test|need to)\b/g,
  /\bsuggesting (?:that )?[\w\s,-]{0,40}? will\b/g,
];

/** PURE: forecast phrases in `text` that the facts never use (case-insensitive). */
export function speculativePhrases(text: string, facts: string): string[] {
  const t = text.toLowerCase();
  const f = facts.toLowerCase();
  const found: string[] = [];
  for (const re of SPECULATIVE) {
    for (const m of t.matchAll(re)) {
      const phrase = m[0];
      if (!f.includes(phrase) && !found.includes(phrase)) found.push(phrase);
    }
  }
  return found;
}

/**
 * PURE: why the site would hide this Original, if it would. The piece names
 * Qatar, so the FULL read-time exclusion check applies (Qatar politics,
 * government, diplomacy and political words), not just the always-terms —
 * the same check `lib/news/originals.ts` runs before showing it. Returns the
 * matched terms (one per pass, so a rewrite sees every problem).
 */
export function originalExclusions(text: string): string[] {
  const found: string[] = [];
  let rest = text;
  for (let i = 0; i < 8; i++) {
    const v = checkExclusion({ texts: [rest] });
    if (!v.excluded || !v.reason) break;
    const term = v.reason.replace(/^[a-z-]+:\s*(?:minister\s+)?/i, "");
    if (!term || found.includes(term)) break;
    found.push(term);
    rest = rest.replace(
      new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "giu"),
      " ",
    );
  }
  return found;
}

/** PURE: split the model's output into headline, dek and body; null if malformed. */
export function parseOriginal(text: string): Omit<Original, "model"> | null {
  const lines = text.trim().split(/\r?\n/);
  const h = lines.findIndex((l) => /^#\s+\S/.test(l));
  const d = lines.findIndex((l) => /^Dek:\s*\S/i.test(l));
  if (h < 0 || d < 0 || d < h) return null;
  const title = lines[h]!.replace(/^#\s+/, "").replace(/\*+/g, "").trim();
  const dek = lines[d]!.replace(/^Dek:\s*/i, "").trim();
  const body = lines
    .slice(d + 1)
    .join("\n")
    .trim();
  if (!title || !dek || wordCount(body) < 250) return null;
  return { title, dek, body };
}

/**
 * Write a Mizaan Original from the day's reports. One rewrite if the draft
 * uses a figure, institution or excluded topic not in the facts; null when
 * unconfigured, malformed or still ungrounded.
 */
export async function generateOriginal(input: OriginalInput): Promise<Original | null> {
  if (!isGroqConfigured() || input.reports.length < 3) return null;
  const facts = originalFacts(input);
  const user = originalPrompt(input);
  const problems = (text: string) => [
    ...ungroundedFigures(text, facts).map((f) => `figure ${f}`),
    ...ungroundedInstitutions(text, facts).map((n) => `name "${n}"`),
    ...originalExclusions(text).map((t) => `excluded topic "${t}"`),
    ...speculativePhrases(text, factsText(facts)).map((p) => `forecast wording "${p}"`),
  ];
  const models = modelsToTry();
  if (models.length === 0) {
    console.warn(
      "[groq] original failed: Groq daily token limit reached on every model",
    );
    return null;
  }
  for (const model of models) {
    try {
      let out = await callGroq(
        model,
        facts,
        false,
        undefined,
        ORIGINAL_SYSTEM,
        user,
        4000,
      );
      let bad = problems(out.body);
      if (bad.length) {
        out = await callGroq(
          model,
          facts,
          false,
          `Your draft has problems: ${bad.join(", ")}. Rewrite it without them (for an excluded topic, drop every sentence about it), keeping the same format.`,
          ORIGINAL_SYSTEM,
          user,
          4000,
        );
        bad = problems(out.body);
        if (bad.length)
          throw new Error(`ungrounded details after rewrite: ${bad.join(", ")}`);
      }
      const parsed = parseOriginal(out.body);
      if (!parsed) throw new Error("original: malformed output");
      return { ...parsed, model: out.model };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (TRY_NEXT_MODEL.test(msg) && models.length > 1) {
        console.warn(
          `[groq] original: model ${model} unavailable (${msg}), trying next`,
        );
        continue;
      }
      console.warn("[groq] original failed:", msg);
      return null;
    }
  }
  return null;
}
