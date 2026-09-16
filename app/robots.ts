import type { MetadataRoute } from "next";

import { SITE_URL as SITE } from "@/lib/site";

/** Our own robots.txt (§6 SEO) — allow crawling, disallow API, point to sitemap. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
