import type { WireCluster } from "@/lib/news/read";
import { SITE_URL as SITE } from "@/lib/site";

/**
 * Shared RSS builder (§6/§8). We publish our own cluster titles + links and a
 * computed ranking line — never third-party article bodies (§10).
 */
export function escapeXml(s: string): string {
  return s.replace(
    /[<>&'"]/g,
    (c) =>
      ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c] ??
      c,
  );
}

function items(clusters: WireCluster[]): string {
  return clusters
    .map(
      (c) => `    <item>
      <title>${escapeXml(c.title)}</title>
      <link>${SITE}/news/${c.slug}</link>
      <guid isPermaLink="true">${SITE}/news/${c.slug}</guid>
      <pubDate>${new Date(c.eventTime).toUTCString()}</pubDate>
      <description>${escapeXml(`Ranked ${c.importanceScore}/100 from ${c.sourceCount} independent sources.`)}</description>
    </item>`,
    )
    .join("\n");
}

export function rssXml(opts: {
  title: string;
  link: string;
  description: string;
  clusters: WireCluster[];
}): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(opts.title)}</title>
    <link>${opts.link}</link>
    <atom:link href="${opts.link}" rel="self" type="application/rss+xml" />
    <description>${escapeXml(opts.description)}</description>
    <language>en</language>
${items(opts.clusters)}
  </channel>
</rss>`;
}

export function rssResponse(xml: string): Response {
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
