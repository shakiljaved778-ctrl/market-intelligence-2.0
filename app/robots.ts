import type { MetadataRoute } from "next";

import { SITE_URL as SITE } from "@/lib/site";

/**
 * robots.txt (§6/§9). Public pages crawlable; internal API, search and preview
 * disallowed; `/api/og` explicitly allowed for social cards.
 *
 * AI-crawler policy (§9 step 5): Googlebot / Google-Extended / Bingbot are always
 * allowed. The AI training crawlers (GPTBot, CCBot, ClaudeBot, …) are allowed by
 * default but can be blocked site-wide by setting BLOCK_AI_CRAWLERS=1.
 */
const AI_CRAWLERS = ["GPTBot", "CCBot", "ClaudeBot", "anthropic-ai", "PerplexityBot"];

export default function robots(): MetadataRoute.Robots {
  const common = {
    allow: ["/", "/api/og"],
    disallow: ["/api/", "/search", "/preview"],
  };
  const rules: MetadataRoute.Robots["rules"] = [
    { userAgent: "*", ...common },
    { userAgent: ["Googlebot", "Google-Extended", "Bingbot"], ...common },
  ];

  if (process.env.BLOCK_AI_CRAWLERS === "1") {
    rules.push({ userAgent: AI_CRAWLERS, disallow: "/" });
  } else {
    rules.push({ userAgent: AI_CRAWLERS, ...common });
  }

  return {
    rules,
    sitemap: [`${SITE}/sitemap.xml`, `${SITE}/news-sitemap.xml`],
    host: SITE,
  };
}
