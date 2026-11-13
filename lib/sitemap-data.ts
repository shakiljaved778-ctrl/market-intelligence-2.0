import { INSTRUMENTS } from "@/content/instruments";
import { SERIES } from "@/lib/economy/series";
import { allSections, readWire } from "@/lib/news/read";
import { listRecaps } from "@/lib/narrative/read";
import { getQuotes } from "@/lib/market/service";
import { GCC_EXCHANGES } from "@/content/gcc-companies";
import { SITE_URL as SITE } from "@/lib/site";

/**
 * Sitemap data (§6 SEO). Served as a sitemap index at /sitemap.xml pointing to
 * the child sitemaps at /sitemaps/<name>.xml. Kept as plain route handlers (not
 * the Next metadata `generateSitemaps`, which does not serve a usable index at
 * /sitemap.xml). Ready to split a child further past the 45,000-URL limit.
 */
export const SITEMAP_NAMES = ["pages", "news-articles", "quotes", "recaps"] as const;
export type SitemapName = (typeof SITEMAP_NAMES)[number];

export interface UrlEntry {
  loc: string;
  lastmod: string;
}

export function isSitemapName(x: string): x is SitemapName {
  return (SITEMAP_NAMES as readonly string[]).includes(x);
}

export async function sitemapUrls(name: SitemapName): Promise<UrlEntry[]> {
  const now = new Date().toISOString();

  if (name === "pages") {
    const staticRoutes = [
      "",
      "/markets",
      "/markets/screener",
      "/news",
      "/sections",
      "/economy",
      "/economy/calendar",
      "/methodology",
      "/about",
      "/newsletter",
      "/briefing",
      "/editorial-policy",
      "/ai-disclosure",
      "/corrections",
      "/contact",
      "/author/shakil-javed",
      "/terms",
      "/privacy",
    ].map((p) => ({ loc: `${SITE}${p}`, lastmod: now }));
    const series = SERIES.filter((s) => s.groups.includes("macro")).map((s) => ({
      loc: `${SITE}/economy/indicator/${encodeURIComponent(s.id)}`,
      lastmod: now,
    }));
    const sections = allSections().map((s) => ({
      loc: `${SITE}/news/section/${s.id}`,
      lastmod: now,
    }));
    const exchanges = GCC_EXCHANGES.map((e) => ({
      loc: `${SITE}/markets/${e.id}`,
      lastmod: now,
    }));
    return [...staticRoutes, ...series, ...sections, ...exchanges];
  }

  if (name === "news-articles") {
    return (await readWire()).map((c) => ({
      loc: `${SITE}/news/${c.slug}`,
      lastmod: new Date(c.eventTime).toISOString(),
    }));
  }

  if (name === "quotes") {
    // Only quote pages that currently carry a real stored price.
    const priced = await getQuotes(INSTRUMENTS.map((i) => i.symbol));
    return INSTRUMENTS.filter((i) => priced.has(i.symbol)).map((i) => ({
      loc: `${SITE}/quote/${i.symbol}`,
      lastmod: now,
    }));
  }

  if (name === "recaps") {
    return (await listRecaps()).map((rec) => ({
      loc: `${SITE}/recap/${rec.slug}`,
      lastmod: now,
    }));
  }

  return [];
}
