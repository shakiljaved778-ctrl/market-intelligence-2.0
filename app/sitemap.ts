import type { MetadataRoute } from "next";
import { UNIVERSE } from "@/fixtures/universe";
import { readWire } from "@/lib/news/read";
import { MACRO_SERIES } from "@/fixtures/macro";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Sitemap (§6 SEO) — static routes plus known instruments, clusters and series. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes = [
    "",
    "/markets",
    "/markets/screener",
    "/news",
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

  return [...staticRoutes, ...quotes, ...clusters, ...series];
}
