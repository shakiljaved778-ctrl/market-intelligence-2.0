import { FIXTURE_ARTICLES, type RawArticle } from "@/fixtures/articles";
import { ARTICLE_BODIES, type ArticleBody } from "@/fixtures/articles-body";

/**
 * Authored content that is legitimately shown in PRODUCTION: the evergreen
 * Eureka explainers (Nobel laureates and their ideas). These are Mizaan's own
 * written pieces, each linking to its nobelprize.org source — real, cited
 * content, not demo data — so they are served in every mode.
 *
 * Everything else in `fixtures/articles.ts` is DEMO news and is reachable only
 * through `lib/demo/fixtures.ts` under DEMO_MODE=1. This file and `lib/demo/`
 * are the only non-test modules allowed to import from `@/fixtures`
 * (scripts/check-fixture-imports.mjs).
 */
export const EUREKA_SOURCE_ID = "nobel-org";

export function eurekaArticles(): RawArticle[] {
  return FIXTURE_ARTICLES.filter((a) => a.sourceId === EUREKA_SOURCE_ID);
}

const EUREKA_IDS = new Set(eurekaArticles().map((a) => a.id));

/** The authored body of a Eureka explainer; null for anything else. */
export function eurekaBody(id: number): ArticleBody | null {
  return EUREKA_IDS.has(id) ? (ARTICLE_BODIES[id] ?? null) : null;
}

export type { RawArticle, ArticleBody };

/**
 * Eureka cover photos (owner request, 2026-11-20: no blank cards). The cluster
 * job finds one Pexels photo per explainer and stores it in KV under this key;
 * pages only read it (no vendor call on render). Searches follow the prize
 * field in the explainer's nobelprize.org link.
 */
export const eurekaCoverKey = (id: number) => `cover:eureka:${id}`;

const FIELD_QUERIES: Record<string, string[]> = {
  physics: ["physics laboratory", "science laboratory"],
  chemistry: ["chemistry laboratory", "science laboratory"],
  medicine: ["microscope laboratory", "medical research"],
  "economic-sciences": ["mathematics chalkboard", "economics"],
  literature: ["library books", "old books"],
  peace: ["peace", "dove"],
};

/** PURE: photo searches for an explainer, from its nobelprize.org URL. */
export function eurekaCoverQueries(url: string): string[] {
  const field = /\/prizes\/([a-z-]+)\//.exec(url)?.[1] ?? "";
  return FIELD_QUERIES[field] ?? ["science laboratory"];
}
