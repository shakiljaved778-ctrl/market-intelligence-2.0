import type { Metadata } from "next";
import { SITE_URL } from "./site";
import { EDITOR, authorSameAs, authorUrl, type Author } from "./author";

/**
 * SEO helpers (Phase 3). One place for canonical URLs, the OG-image URL on our
 * existing /api/og design, and the JSON-LD builders so every page emits
 * consistent, valid structured data. Pure functions — unit-tested in seo.test.ts.
 */

/** Social profiles for Organization.sameAs. Fill with the real URLs when live. */
export const SOCIAL_LINKS: string[] = [
  // "https://www.linkedin.com/company/mizaan-intelligence",
  // "https://x.com/mizaan",
];

const ORG_NAME = "Mizaan Intelligence";

/** Absolute canonical URL for a path: single host, no trailing slash, no query. */
export function canonical(path: string): string {
  const noQuery = path.split("?")[0] ?? path;
  const clean = noQuery.replace(/\/+$/, "");
  return `${SITE_URL}${clean}`;
}

/** Metadata for a static page: title (templated with "| Mizaan"), description, canonical. */
export function pageMeta(path: string, title: string, description: string): Metadata {
  return { title, description, alternates: { canonical: canonical(path) } };
}

/** OG image URL rendered on the existing /api/og design. */
export function ogImage(title: string, kicker?: string): string {
  const q = new URLSearchParams({ title });
  if (kicker) q.set("kicker", kicker);
  return `${SITE_URL}/api/og?${q.toString()}`;
}

export interface JsonLd {
  "@context": "https://schema.org";
  "@graph": Record<string, unknown>[];
}

export function organizationLd(): Record<string, unknown> {
  return {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: ORG_NAME,
    url: SITE_URL,
    logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.svg` },
    description:
      "Signal-ranked market intelligence across global and GCC markets — computed rankings and cited, AI-written summaries.",
    email: EDITOR.email,
    publishingPrinciples: `${SITE_URL}/editorial-policy`,
    correctionsPolicy: `${SITE_URL}/corrections`,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "editorial",
      email: EDITOR.email,
      url: `${SITE_URL}/contact`,
    },
    ...(SOCIAL_LINKS.length > 0 ? { sameAs: SOCIAL_LINKS } : {}),
  };
}

/** Person schema for the editor (author page + NewsArticle author/editor). */
export function personLd(a: Author = EDITOR): Record<string, unknown> {
  const sameAs = authorSameAs(a);
  return {
    "@type": "Person",
    "@id": `${authorUrl(a)}#person`,
    name: a.name,
    jobTitle: a.role,
    url: authorUrl(a),
    worksFor: { "@id": `${SITE_URL}/#organization` },
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

export function websiteLd(): Record<string, unknown> {
  return {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: ORG_NAME,
    url: SITE_URL,
    publisher: { "@id": `${SITE_URL}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/api/market/search?q={query}`,
      "query-input": "required name=query",
    },
  };
}

/** The site-wide graph (Organization + WebSite) for the root layout. */
export function siteLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@graph": [organizationLd(), websiteLd()],
  };
}

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export function breadcrumbLd(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: canonical(it.path),
    })),
  };
}

export interface NewsArticleInput {
  headline: string;
  description?: string | null;
  slug: string;
  datePublished: string;
  dateModified?: string;
  section: string;
  /** Source URLs the story is based on (isBasedOn). */
  sources?: string[];
  imageUrl?: string | null;
}

export function newsArticleLd(a: NewsArticleInput): Record<string, unknown> {
  const url = canonical(`/news/${a.slug}`);
  return {
    "@type": "NewsArticle",
    headline: a.headline,
    ...(a.description ? { description: a.description } : {}),
    datePublished: a.datePublished,
    dateModified: a.dateModified ?? a.datePublished,
    articleSection: a.section,
    url,
    mainEntityOfPage: url,
    isAccessibleForFree: true,
    image: [a.imageUrl ?? ogImage(a.headline, a.section)],
    author: { "@id": `${authorUrl()}#person` },
    editor: { "@id": `${authorUrl()}#person` },
    publisher: { "@id": `${SITE_URL}/#organization` },
    ...(a.sources && a.sources.length > 0 ? { isBasedOn: a.sources } : {}),
  };
}

export interface CorporationInput {
  name: string;
  ticker: string;
  url: string;
}

export function corporationLd(c: CorporationInput): Record<string, unknown> {
  return {
    "@type": "Corporation",
    name: c.name,
    tickerSymbol: c.ticker,
    url: c.url,
  };
}

/** Wrap one or more entities into a JSON-LD graph document. */
export function graph(...entities: Record<string, unknown>[]): JsonLd {
  return { "@context": "https://schema.org", "@graph": entities };
}
