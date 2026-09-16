import Parser from "rss-parser";
import { loadSources, type SourceConfig } from "./config";
import { isAllowed } from "./robots";
import {
  canonicalizeUrl,
  headlineHash,
  normalizeText,
  truncateDek,
  type NormalizedArticle,
} from "./normalize";

/**
 * Ingest (§9 Stage 1, §10). Pull each active feed, honour robots.txt INSIDE the
 * fetcher, normalise, and dedupe on canonical URL + headline hash. We store
 * headline, dek (≤40 words), link, timestamp and source — NEVER body text.
 */
const parser = new Parser({ timeout: 15000 });

export interface IngestResult {
  articles: NormalizedArticle[];
  perSource: Record<string, number>;
  skippedByRobots: number;
}

async function fetchFeed(source: SourceConfig): Promise<NormalizedArticle[]> {
  if (!(await isAllowed(source.feed_url))) return [];
  const res = await fetch(source.feed_url, {
    headers: { "user-agent": "MizanBot" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${source.id}: HTTP ${res.status}`);
  const xml = await res.text();
  const feed = await parser.parseString(xml);

  return feed.items
    .filter((item) => item.title && item.link)
    .map((item): NormalizedArticle => {
      const url = item.link as string;
      const headline = normalizeText(item.title as string);
      // contentSnippet is the feed's short summary — we truncate to a dek and
      // never keep full body content (§10).
      const dek = truncateDek(item.contentSnippet ?? item.summary ?? null);
      return {
        sourceId: source.id,
        url,
        canonicalUrl: canonicalizeUrl(url),
        headline,
        dek,
        publishedAt: (
          item.isoDate ??
          item.pubDate ??
          new Date().toISOString()
        ).toString(),
        author: item.creator ?? null,
        rawHash: headlineHash(headline),
      };
    });
}

/** Deduplicate a batch on canonical URL and on the normalised-headline hash. */
export function dedupe(articles: NormalizedArticle[]): NormalizedArticle[] {
  const seenUrl = new Set<string>();
  const seenHash = new Set<string>();
  const out: NormalizedArticle[] = [];
  for (const a of articles) {
    if (seenUrl.has(a.canonicalUrl) || seenHash.has(a.rawHash)) continue;
    seenUrl.add(a.canonicalUrl);
    seenHash.add(a.rawHash);
    out.push(a);
  }
  return out;
}

export async function ingestAll(sources = loadSources()): Promise<IngestResult> {
  const active = sources.filter((s) => s.active && s.kind === "rss");
  const perSource: Record<string, number> = {};
  let skippedByRobots = 0;
  const collected: NormalizedArticle[] = [];

  for (const source of active) {
    try {
      if (!(await isAllowed(source.feed_url))) {
        skippedByRobots += 1;
        continue;
      }
      const items = await fetchFeed(source);
      perSource[source.id] = items.length;
      collected.push(...items);
    } catch {
      perSource[source.id] = 0; // failure recorded via job_runs upstream
    }
  }

  return { articles: dedupe(collected), perSource, skippedByRobots };
}
