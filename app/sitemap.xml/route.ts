import { SITEMAP_NAMES } from "@/lib/sitemap-data";
import { SITE_URL as SITE } from "@/lib/site";

// Sitemap index (§6 SEO): points at each child sitemap under /sitemaps/<name>.xml.
export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date().toISOString();
  const entries = SITEMAP_NAMES.map(
    (name) => `  <sitemap>
    <loc>${SITE}/sitemaps/${name}.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>`,
  ).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
