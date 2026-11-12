import { loadEntities, loadTickers, loadTopics } from "./config";

/**
 * Classification (§9 Stage 2) — NO model. Tickers, entities and topics are
 * resolved from committed, reviewable dictionaries. Deterministic beats clever:
 * a rule file you can inspect and fix beats a model you can't.
 */
export interface Classification {
  tickers: string[];
  entities: string[];
  topics: string[];
}

// Word-ish boundary match, case-insensitive. Escapes regex metachars in aliases.
// Exported so the section classifier reuses the exact same matcher (§9).
export function mentions(haystack: string, needle: string): boolean {
  const esc = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^A-Za-z0-9])${esc}([^A-Za-z0-9]|$)`, "i").test(haystack);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Case-SENSITIVE whole-token match — for proper nouns (company names) and
 * explicit upper-case aliases ("IBM", "BTC"). "Apple" matches; "apple" in
 * "apple harvest" does not.
 */
export function mentionsExact(haystack: string, needle: string): boolean {
  return new RegExp(`(^|[^A-Za-z0-9])${escapeRegex(needle)}([^A-Za-z0-9]|$)`).test(
    haystack,
  );
}

/**
 * A bare ticker SYMBOL counts only in market context: "$NOW", "(NOW)" or
 * "(NYSE: NOW)". Plain words never do — the old case-insensitive symbol match
 * turned "now", "low", "Dec" and "de" in ordinary headlines into the tickers
 * NOW, LOW, DEC and DE, which then mis-filed those stories under Markets.
 */
export function mentionsTicker(haystack: string, symbol: string): boolean {
  const s = escapeRegex(symbol);
  const cashtag = new RegExp(`\\$${s}(?![A-Za-z0-9])`);
  const bracketed = new RegExp(`\\((?:[A-Z]{2,10}:\\s*)?${s}\\)`);
  return cashtag.test(haystack) || bracketed.test(haystack);
}

let cache: {
  tickers: [string, string[]][];
  entities: { name: string; aliases: string[] }[];
  topics: [string, string[]][];
} | null = null;

function dicts() {
  if (cache) return cache;
  const tickers = Object.entries(loadTickers());
  const entities = loadEntities().map((e) => ({
    name: e.name,
    aliases: [e.name, ...e.aliases],
  }));
  const topics = Object.entries(loadTopics());
  cache = { tickers, entities, topics };
  return cache;
}

/** Reset the dictionary cache (tests). */
export function __resetClassifyCache(): void {
  cache = null;
}

export function classify(headline: string, dek: string | null): Classification {
  const text = `${headline} ${dek ?? ""}`;
  const { tickers, entities, topics } = dicts();

  const foundTickers = new Set<string>();
  for (const [symbol, aliases] of tickers) {
    if (mentionsTicker(text, symbol) || aliases.some((a) => mentionsExact(text, a))) {
      foundTickers.add(symbol);
    }
  }

  const foundEntities = new Set<string>();
  for (const e of entities) {
    if (e.aliases.some((a) => mentions(text, a))) foundEntities.add(e.name);
  }

  const foundTopics = new Set<string>();
  for (const [topic, keywords] of topics) {
    if (keywords.some((k) => mentions(text, k))) foundTopics.add(topic);
  }

  return {
    tickers: [...foundTickers],
    entities: [...foundEntities],
    topics: [...foundTopics],
  };
}
