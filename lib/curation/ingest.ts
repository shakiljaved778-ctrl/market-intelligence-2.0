import Parser from "rss-parser";
import { loadSources, type SourceConfig } from "./config";
import { evaluateQuality } from "./quality";
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
    headers: { "user-agent": "MizaanBot" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${source.id}: HTTP ${res.status}`);
  const xml = await res.text();
  const feed = await parser.parseString(normalizeFeedXml(xml));

  const articles = feed.items
    // An item with no publication date is skipped: we never stamp a story with
    // the time we happened to fetch it (that made old documents look new).
    .filter((item) => item.title && item.link && (item.isoDate ?? item.pubDate))
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
        publishedAt: (item.isoDate ?? item.pubDate ?? "").toString(),
        author: item.creator ?? null,
        rawHash: headlineHash(headline),
      };
    })
    .filter((a) => Number.isFinite(Date.parse(a.publishedAt)));
  return capNewest(articles, source.max_items_per_run);
}

/** Keep only the `max` newest items of a feed (no cap when `max` is unset). */
/**
 * Some publishers (the Qatar News Agency among them) emit a valid RSS 2.0
 * document whose root `<rss>` element has no `version` attribute, which
 * rss-parser rejects. Treat a versionless `<rss>` root as 2.0. Nothing else in
 * the document is changed.
 */
export function normalizeFeedXml(xml: string): string {
  return xml.replace(/<rss(?![^>]*\bversion\s*=)(?=[\s>])/, '<rss version="2.0"');
}

export function capNewest(
  articles: NormalizedArticle[],
  max: number | undefined,
): NormalizedArticle[] {
  if (!max || articles.length <= max) return articles;
  return [...articles]
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, max);
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
    } catch (err) {
      // One bad feed must not stop the run, but it must be visible in the log.
      perSource[source.id] = 0;
      console.warn(
        `[ingest] ${source.id} failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  console.log(`[ingest] items per source: ${JSON.stringify(perSource)}`);

  // Quality gate (Phase 2 §3/§4): drop seed-style headlines that name nothing
  // specific, but KEEP raw institutional titles — the summariser rewrites those
  // downstream into factual headlines. Every drop is logged.
  const articles = dedupe(collected).filter((a) => {
    const q = evaluateQuality({ headline: a.headline });
    if (!q.ok && !q.needsRewrite) {
      console.warn(
        `[ingest] dropped low-quality headline: "${a.headline}" (${q.reasons.join(",")})`,
      );
      return false;
    }
    return true;
  });

  return { articles, perSource, skippedByRobots };
}
