import { isSitemapName, sitemapUrls } from "@/lib/sitemap-data";

// Child sitemaps (§6 SEO): /sitemaps/pages.xml, /sitemaps/news-articles.xml,
// /sitemaps/quotes.xml, /sitemaps/recaps.xml. The ".xml" suffix is part of the
// dynamic segment, so we strip it before matching.
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  const key = name.replace(/\.xml$/, "");
  if (!isSitemapName(key)) {
    return new Response("Not found", { status: 404 });
  }

  const urls = await sitemapUrls(key);
  const body = urls
    .map(
      (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
  </url>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
