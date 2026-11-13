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
