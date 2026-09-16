import type { MetadataRoute } from "next";
import { UNIVERSE } from "@/fixtures/universe";
import { allSections, readWire } from "@/lib/news/read";
import { MACRO_SERIES } from "@/fixtures/macro";

import { SITE_URL as SITE } from "@/lib/site";

/** Sitemap (§6 SEO) — static routes plus known instruments, clusters and series. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
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
  ].map((path) => ({ url: `${SITE}${path}`, lastModified: now }));

  const quotes = UNIVERSE.map((r) => ({
    url: `${SITE}/quote/${r.symbol}`,
    lastModified: now,
  }));
  const clusters = (await readWire()).map((c) => ({
    url: `${SITE}/news/${c.slug}`,
    lastModified: new Date(c.eventTime),
  }));
  const series = MACRO_SERIES.map((s) => ({
    url: `${SITE}/economy/indicator/${encodeURIComponent(s.id)}`,
    lastModified: now,
  }));
  const sectionRoutes = allSections().map((s) => ({
    url: `${SITE}/news?section=${s.id}`,
    lastModified: now,
  }));

  return [...staticRoutes, ...quotes, ...clusters, ...series, ...sectionRoutes];
}
