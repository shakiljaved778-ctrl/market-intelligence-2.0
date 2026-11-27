import { parseBlocks } from "@/components/news/ArticleBody";

/**
 * Key takeaways (owner request, 2026-11-27): 3–4 bullets at the top of an
 * AI-written article, taken DETERMINISTICALLY from the article itself — the
 * first sentence of the opening and of each substantive section, plus its
 * "Why it matters" / "The bottom line" line. No extra model call, nothing new
 * is written: every bullet is a sentence the grounded article already contains.
 * Generic sections ("Background", "What to watch") are skipped.
 */
export const MAX_TAKEAWAYS = 4;
const MAX_WORDS = 40;

const SKIP_SECTIONS = /^(background|what to watch)\b/i;
const CLOSING = /^\*{0,2}(why it matters|the bottom line):?\*{0,2}:?\s*/i;
// Tokens that end in a full stop without ending the sentence.
const NO_BREAK =
  /(?:\b[A-Z]|\b(?:Mr|Mrs|Ms|Dr|St|Inc|Co|Corp|Ltd|Jr|Sr|vs|No|Gov|Sen|Rep|approx|est))\.$/;

/** PURE: the first sentence of a paragraph (abbreviation- and decimal-safe). */
export function firstSentence(text: string): string {
  const t = text.replace(/\*\*/g, "").trim();
  const re = /[.!?](?=\s+["“‘(]?[A-Z0-9])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    const upto = t.slice(0, m.index + 1);
    if (NO_BREAK.test(upto)) continue;
    return upto.trim();
  }
  return t;
}

function trimWords(s: string): string {
  const words = s.split(/\s+/);
  return words.length <= MAX_WORDS ? s : `${words.slice(0, MAX_WORDS).join(" ")}…`;
}

/** PURE: up to MAX_TAKEAWAYS bullets from an article body ([] when too thin). */
export function keyTakeaways(md: string): string[] {
  const blocks = parseBlocks(md);
  const clean = (s: string) =>
    trimWords(s.replace(CLOSING, "").replace(/\*\*/g, "").trim());
  const body: string[] = [];
  let closing: string | null = null;
  let section: string | null = null;
  let tookSection = false;
  for (const b of blocks) {
    if (b.kind === "heading") {
      section = b.text;
      tookSection = false;
    } else if (CLOSING.test(b.text)) {
      closing = clean(b.text);
    } else if (section === null) {
      if (body.length === 0) body.push(clean(firstSentence(b.text))); // the opening
    } else if (!tookSection && !SKIP_SECTIONS.test(section)) {
      body.push(clean(firstSentence(b.text)));
      tookSection = true;
    }
  }
  const seen = new Set<string>();
  const usable = (s: string) => {
    const k = s.toLowerCase();
    if (s.split(/\s+/).length < 5 || seen.has(k)) return false;
    seen.add(k);
    return true;
  };
  const tail = closing && usable(closing) ? [closing] : [];
  const bullets = body.filter(usable).slice(0, MAX_TAKEAWAYS - tail.length);
  const all = [...bullets, ...tail];
  return all.length >= 2 ? all : [];
}
