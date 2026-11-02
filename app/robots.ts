import type { MetadataRoute } from "next";

import { SITE_URL as SITE } from "@/lib/site";

/**
 * robots.txt (§6 SEO). Public pages are crawlable; internal API, search results
 * and preview routes are not. `/api/og` is explicitly allowed so social cards
 * render. Points crawlers at the sitemap index.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/api/og"],
        disallow: ["/api/", "/search", "/preview"],
      },
    ],
    sitemap: [`${SITE}/sitemap.xml`, `${SITE}/news-sitemap.xml`],
    host: SITE,
  };
}
