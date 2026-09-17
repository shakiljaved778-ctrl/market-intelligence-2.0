import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
  vector,
} from "drizzle-orm/pg-core";

/**
 * Database schema (§8). Drizzle + pgvector. Migrations are committed.
 *
 * INVARIANT (§10, §17): `articles` has NO body column, ever. We store the
 * headline, dek (≤40 words), link, timestamp and source — never article text.
 */

export const sources = pgTable(
  "sources",
  {
    id: serial("id").primaryKey(),
    // Stable natural key = the id in content/sources.yaml. Upsert target.
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    homepage: text("homepage"),
    feedUrl: text("feed_url"),
    kind: text("kind", { enum: ["rss", "api"] }).notNull(),
    region: text("region"),
    tier: text("tier", { enum: ["wire", "outlet", "regulator", "primary"] }).notNull(),
    trustScore: integer("trust_score").notNull().default(50),
    licenseNote: text("license_note").notNull(),
    active: boolean("active").notNull().default(true),
    lastFetchedAt: timestamp("last_fetched_at", { withTimezone: true }),
    failureCount: integer("failure_count").notNull().default(0),
  },
  (t) => [uniqueIndex("sources_slug_uq").on(t.slug)],
);

export const articles = pgTable(
  "articles",
  {
    id: serial("id").primaryKey(),
    sourceId: integer("source_id")
      .notNull()
      .references(() => sources.id),
    url: text("url").notNull(),
    canonicalUrl: text("canonical_url"),
    headline: text("headline").notNull(),
    /** ≤ 40 words — enforced at ingest and truncated at the formatter (§10). */
    dek: text("dek"),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
    author: text("author"),
    language: text("language"),
    region: text("region"),
    /** Hash of the normalised headline for dedupe. */
    rawHash: text("raw_hash").notNull(),
    entities: jsonb("entities"),
    tickers: text("tickers").array(),
    topics: text("topics").array(),
    embedding: vector("embedding", { dimensions: 384 }),
    isPaywalled: boolean("is_paywalled").notNull().default(false),
    status: text("status", { enum: ["new", "clustered", "discarded"] })
      .notNull()
      .default("new"),
    // NO body column. Ever. (§10, §17)
  },
  (t) => [
    uniqueIndex("articles_url_uq").on(t.url),
    index("articles_published_idx").on(t.publishedAt.desc()),
    index("articles_status_idx").on(t.status),
    index("articles_tickers_gin").using("gin", t.tickers),
    index("articles_embedding_hnsw").using("hnsw", t.embedding.op("vector_cosine_ops")),
  ],
);

export const clusters = pgTable(
  "clusters",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    primaryTopic: text("primary_topic"),
    region: text("region"),
    tickers: text("tickers").array(),
    eventTime: timestamp("event_time", { withTimezone: true }),
    importanceScore: integer("importance_score").notNull().default(0),
    sourceCount: integer("source_count").notNull().default(0),
    articleCount: integer("article_count").notNull().default(0),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastUpdatedAt: timestamp("last_updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    status: text("status", { enum: ["forming", "published", "stale"] })
      .notNull()
      .default("forming"),
    // AI-written brief for this cluster (Groq, §13). ORIGINAL content synthesised
    // from the story's facts — never source article text (§10, which governs the
    // articles table). Generated once in the cluster job.
    briefMd: text("brief_md"),
    briefModel: text("brief_model"),
  },
  (t) => [
    uniqueIndex("clusters_slug_uq").on(t.slug),
    index("clusters_rank_idx").on(t.importanceScore.desc(), t.lastUpdatedAt.desc()),
    index("clusters_tickers_gin").using("gin", t.tickers),
  ],
);

export const clusterArticles = pgTable(
  "cluster_articles",
  {
    clusterId: integer("cluster_id")
      .notNull()
      .references(() => clusters.id),
    articleId: integer("article_id")
      .notNull()
      .references(() => articles.id),
    similarity: real("similarity"),
    isPrimary: boolean("is_primary").notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.clusterId, t.articleId] })],
);

export const recaps = pgTable(
  "recaps",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    kind: text("kind", {
      enum: ["session_open", "session_close", "weekly", "instrument"],
    }).notNull(),
    bodyMd: text("body_md").notNull(),
    /** Deterministic output, fully reproducible from these inputs (§9). */
    inputs: jsonb("inputs").notNull(),
    templateVersion: text("template_version").notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("recaps_slug_uq").on(t.slug)],
);

export const instruments = pgTable("instruments", {
  symbol: text("symbol").primaryKey(),
  exchange: text("exchange"),
  name: text("name").notNull(),
  assetClass: text("asset_class").notNull(),
  nativeCurrency: text("native_currency").notNull().default("USD"),
  sector: text("sector"),
  industry: text("industry"),
  country: text("country"),
  isin: text("isin"),
  isShariahCompliant: boolean("is_shariah_compliant"),
  dataDelayMinutes: integer("data_delay_minutes").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const quotes = pgTable(
  "quotes",
  {
    symbol: text("symbol")
      .notNull()
      .references(() => instruments.symbol),
    ts: timestamp("ts", { withTimezone: true }).notNull(),
    priceUsd: doublePrecision("price_usd").notNull(),
    nativePrice: doublePrecision("native_price"),
    fxRateUsed: doublePrecision("fx_rate_used").notNull().default(1),
    change: doublePrecision("change"),
    changePct: doublePrecision("change_pct"),
    open: doublePrecision("open"),
    high: doublePrecision("high"),
    low: doublePrecision("low"),
    prevClose: doublePrecision("prev_close"),
    volume: doublePrecision("volume"),
    marketCapUsd: doublePrecision("market_cap_usd"),
    provider: text("provider").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.symbol, t.ts] }),
    index("quotes_symbol_idx").on(t.symbol),
  ],
);

export const candlesDaily = pgTable(
  "candles_daily",
  {
    symbol: text("symbol")
      .notNull()
      .references(() => instruments.symbol),
    date: date("date").notNull(),
    o: doublePrecision("o").notNull(),
    h: doublePrecision("h").notNull(),
    l: doublePrecision("l").notNull(),
    c: doublePrecision("c").notNull(),
    v: doublePrecision("v"),
    adjClose: doublePrecision("adj_close"),
  },
  (t) => [primaryKey({ columns: [t.symbol, t.date] })],
);

export const fxRates = pgTable(
  "fx_rates",
  {
    base: text("base").notNull(),
    quote: text("quote").notNull(),
    date: date("date").notNull(),
    rate: doublePrecision("rate").notNull(),
    source: text("source").notNull(),
  },
  (t) => [primaryKey({ columns: [t.base, t.quote, t.date] })],
);

export const macroSeries = pgTable("macro_series", {
  id: text("id").primaryKey(), // e.g. 'FRED:CPIAUCSL'
  name: text("name").notNull(),
  unit: text("unit"),
  frequency: text("frequency"),
  source: text("source").notNull(),
  region: text("region"),
  description: text("description"),
});

export const macroObs = pgTable(
  "macro_obs",
  {
    seriesId: text("series_id")
      .notNull()
      .references(() => macroSeries.id),
    date: date("date").notNull(),
    value: doublePrecision("value"),
  },
  (t) => [
    primaryKey({ columns: [t.seriesId, t.date] }),
    index("macro_obs_series_date_idx").on(t.seriesId, t.date.desc()),
  ],
);

export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  kind: text("kind", { enum: ["earnings", "macro", "ipo", "dividend"] }).notNull(),
  ts: timestamp("ts", { withTimezone: true }).notNull(),
  symbol: text("symbol"),
  seriesId: text("series_id"),
  title: text("title").notNull(),
  consensus: doublePrecision("consensus"),
  actual: doublePrecision("actual"),
  previous: doublePrecision("previous"),
  importance: integer("importance").notNull().default(0),
});

export const jobRuns = pgTable("job_runs", {
  id: serial("id").primaryKey(),
  job: text("job").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  itemsIn: integer("items_in"),
  itemsOut: integer("items_out"),
  outcome: text("outcome", { enum: ["ok", "partial", "error"] }),
  error: text("error"),
});

/*
 * V2 seam (§16): a `briefs` table will slot in after ranking, persisting
 * model_id, prompt_version, source_article_ids, generated_at and guardrail
 * results. Nothing writes to it in V1 — design the audit trail, build none of it.
 */

export const enableVectorExtension = sql`CREATE EXTENSION IF NOT EXISTS vector;`;
