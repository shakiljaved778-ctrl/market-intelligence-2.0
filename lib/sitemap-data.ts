import { UNIVERSE } from "@/fixtures/universe";
import { MACRO_SERIES } from "@/fixtures/macro";
import { allSections, readWire } from "@/lib/news/read";
import { listRecaps } from "@/lib/narrative/read";
import { readQuote } from "@/lib/market/read";
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
      "/terms",
      "/privacy",
    ].map((p) => ({ loc: `${SITE}${p}`, lastmod: now }));
    const series = MACRO_SERIES.map((s) => ({
      loc: `${SITE}/economy/indicator/${encodeURIComponent(s.id)}`,
      lastmod: now,
    }));
    const sections = allSections().map((s) => ({
      loc: `${SITE}/news/section/${s.id}`,
      lastmod: now,
    }));
    return [...staticRoutes, ...series, ...sections];
  }

  if (name === "news-articles") {
    return (await readWire()).map((c) => ({
      loc: `${SITE}/news/${c.slug}`,
      lastmod: new Date(c.eventTime).toISOString(),
    }));
  }

  if (name === "quotes") {
    const rows = await Promise.all(
      UNIVERSE.map(async (r) => ({ r, quote: await readQuote(r.symbol) })),
    );
    // Only quote pages with a resolvable quote (real data only, in live mode).
    return rows
      .filter((x) => x.quote !== null)
      .map((x) => ({ loc: `${SITE}/quote/${x.r.symbol}`, lastmod: now }));
  }

  if (name === "recaps") {
    return listRecaps().map((rec) => ({
      loc: `${SITE}/recap/${rec.slug}`,
      lastmod: now,
    }));
  }

  return [];
}
