/**
 * Probe candidate Gulf sources (content/source-candidates.yaml) and print a
 * report. READ-ONLY: it fetches each robots.txt and each candidate URL once,
 * stores nothing and enables nothing. Run on GitHub Actions, where these sites
 * are reachable (`.github/workflows/probe-sources.yml`).
 *
 * For each candidate it reports:
 *   - whether robots.txt allows our user-agent the path;
 *   - the HTTP status and content type;
 *   - if the response is an RSS/Atom feed: the item count and newest item date;
 *   - if it is a web page: any feed links it advertises.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Parser from "rss-parser";
import { parse } from "yaml";
import { parseRobots, pathAllowed } from "@/lib/curation/robots";

interface Candidate {
  id: string;
  name: string;
  url: string;
  region: string;
}

const UA = "MizaanBot (+https://www.mizaan.tech/about)";
const parser = new Parser({ timeout: 15000 });

async function get(url: string): Promise<Response | null> {
  try {
    return await fetch(url, {
      headers: { "user-agent": UA, accept: "*/*" },
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return null;
  }
}

async function robotsVerdict(url: string): Promise<string> {
  const u = new URL(url);
  const res = await get(`${u.origin}/robots.txt`);
  if (!res) return "robots.txt unreachable";
  if (!res.ok) return `no robots.txt (HTTP ${res.status}) — allowed by convention`;
  return pathAllowed(parseRobots(await res.text()), u.pathname)
    ? "allowed"
    : "DISALLOWED";
}

function feedLinks(html: string, base: string): string[] {
  const out = new Set<string>();
  const alt = /<link[^>]+type=["']application\/(?:rss|atom)\+xml["'][^>]*>/gi;
  for (const tag of html.match(alt) ?? []) {
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
    if (href) out.add(new URL(href, base).toString());
  }
  const anchors = /href=["']([^"']*(?:rss|feed|\.xml)[^"']*)["']/gi;
  for (const m of html.matchAll(anchors)) {
    try {
      out.add(new URL(m[1] as string, base).toString());
    } catch {
      /* ignore malformed */
    }
  }
  return [...out].slice(0, 15);
}

async function probe(c: Candidate): Promise<string[]> {
  const lines = [`## ${c.id} — ${c.name} (${c.region})`, `url: ${c.url}`];
  lines.push(`robots: ${await robotsVerdict(c.url)}`);
  const res = await get(c.url);
  if (!res) {
    lines.push("fetch: FAILED (network error or timeout)");
    return lines;
  }
  const type = res.headers.get("content-type") ?? "";
  lines.push(`fetch: HTTP ${res.status} · ${type} · final ${res.url}`);
  if (!res.ok) return lines;
  const body = await res.text();
  const looksXml =
    /xml|rss|atom/i.test(type) || /^\s*<\?xml|<rss|<feed/i.test(body.slice(0, 500));
  if (looksXml) {
    try {
      const feed = await parser.parseString(body);
      const dates = feed.items
        .map((i) => Date.parse(i.isoDate ?? i.pubDate ?? ""))
        .filter(Number.isFinite)
        .sort((a, b) => b - a);
      lines.push(
        `feed: ${feed.items.length} items · newest ${dates[0] ? new Date(dates[0]).toISOString() : "undated"} · title "${feed.title ?? ""}"`,
      );
      for (const i of feed.items.slice(0, 3))
        lines.push(`  - ${i.title ?? "(untitled)"}`);
    } catch (err) {
      lines.push(
        `feed: unparseable (${err instanceof Error ? err.message : String(err)})`,
      );
    }
  } else {
    const links = feedLinks(body, res.url);
    lines.push(
      links.length
        ? `page: ${links.length} feed-like links`
        : "page: no feed links found",
    );
    for (const l of links) lines.push(`  - ${l}`);
  }
  return lines;
}

async function main(): Promise<void> {
  const raw = parse(
    readFileSync(join(process.cwd(), "content", "source-candidates.yaml"), "utf8"),
  ) as { candidates: Candidate[] };
  for (const c of raw.candidates) {
    console.log((await probe(c)).join("\n"));
    console.log("");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
