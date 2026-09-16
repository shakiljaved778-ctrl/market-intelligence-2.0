import { readWire } from "@/lib/news/read";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Outbound RSS (§6) — our own ranked wire of computed clusters. We publish our
// cluster titles + links, never third-party article bodies.
export const dynamic = "force-dynamic";

function esc(s: string): string {
  return s.replace(
    /[<>&'"]/g,
    (c) =>
      ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c] ??
      c,
  );
}

export async function GET() {
  const clusters = await readWire();
  const items = clusters
    .map(
      (c) => `    <item>
      <title>${esc(c.title)}</title>
      <link>${SITE}/news/${c.slug}</link>
      <guid isPermaLink="true">${SITE}/news/${c.slug}</guid>
      <pubDate>${new Date(c.eventTime).toUTCString()}</pubDate>
      <description>${esc(`Ranked ${c.importanceScore}/100 from ${c.sourceCount} independent sources.`)}</description>
    </item>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Mizan — the wire</title>
    <link>${SITE}/news</link>
    <description>Signal-ranked market intelligence. Computed, not AI-written.</description>
    <language>en</language>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
