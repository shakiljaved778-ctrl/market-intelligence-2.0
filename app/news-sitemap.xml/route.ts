import { readWire } from "@/lib/news/read";
import { escapeXml } from "@/lib/rss";
import { SITE_URL as SITE } from "@/lib/site";

/**
 * Google News sitemap (§4): articles published in the last 48h, in the news:
 * namespace, capped at 1,000. Referenced from robots.txt. Google News requires
 * only genuinely recent items here — the full archive lives in the main sitemaps.
 */
export const dynamic = "force-dynamic";

const WINDOW_MS = 48 * 60 * 60 * 1000;

export async function GET() {
  const now = Date.now();
  const recent = (await readWire())
    .filter((c) => now - new Date(c.eventTime).getTime() <= WINDOW_MS)
    .slice(0, 1000);

  const items = recent
    .map(
      (c) => `  <url>
    <loc>${SITE}/news/${c.slug}</loc>
    <news:news>
      <news:publication>
        <news:name>Mizaan Intelligence</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${new Date(c.eventTime).toISOString()}</news:publication_date>
      <news:title>${escapeXml(c.title)}</news:title>
    </news:news>
  </url>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${items}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
