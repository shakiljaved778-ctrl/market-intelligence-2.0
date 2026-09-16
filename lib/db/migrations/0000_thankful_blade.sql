CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TABLE "articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" integer NOT NULL,
	"url" text NOT NULL,
	"canonical_url" text,
	"headline" text NOT NULL,
	"dek" text,
	"published_at" timestamp with time zone NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"author" text,
	"language" text,
	"region" text,
	"raw_hash" text NOT NULL,
	"entities" jsonb,
	"tickers" text[],
	"topics" text[],
	"embedding" vector(384),
	"is_paywalled" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'new' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"ts" timestamp with time zone NOT NULL,
	"symbol" text,
	"series_id" text,
	"title" text NOT NULL,
	"consensus" double precision,
	"actual" double precision,
	"previous" double precision,
	"importance" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candles_daily" (
	"symbol" text NOT NULL,
	"date" date NOT NULL,
	"o" double precision NOT NULL,
	"h" double precision NOT NULL,
	"l" double precision NOT NULL,
	"c" double precision NOT NULL,
	"v" double precision,
	"adj_close" double precision,
	CONSTRAINT "candles_daily_symbol_date_pk" PRIMARY KEY("symbol","date")
);
--> statement-breakpoint
CREATE TABLE "cluster_articles" (
	"cluster_id" integer NOT NULL,
	"article_id" integer NOT NULL,
	"similarity" real,
	"is_primary" boolean DEFAULT false NOT NULL,
	CONSTRAINT "cluster_articles_cluster_id_article_id_pk" PRIMARY KEY("cluster_id","article_id")
);
--> statement-breakpoint
CREATE TABLE "clusters" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"primary_topic" text,
	"region" text,
	"tickers" text[],
	"event_time" timestamp with time zone,
	"importance_score" integer DEFAULT 0 NOT NULL,
	"source_count" integer DEFAULT 0 NOT NULL,
	"article_count" integer DEFAULT 0 NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text DEFAULT 'forming' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fx_rates" (
	"base" text NOT NULL,
	"quote" text NOT NULL,
	"date" date NOT NULL,
	"rate" double precision NOT NULL,
	"source" text NOT NULL,
	CONSTRAINT "fx_rates_base_quote_date_pk" PRIMARY KEY("base","quote","date")
);
--> statement-breakpoint
CREATE TABLE "instruments" (
	"symbol" text PRIMARY KEY NOT NULL,
	"exchange" text,
	"name" text NOT NULL,
	"asset_class" text NOT NULL,
	"native_currency" text DEFAULT 'USD' NOT NULL,
	"sector" text,
	"industry" text,
	"country" text,
	"isin" text,
	"is_shariah_compliant" boolean,
	"data_delay_minutes" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"job" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"items_in" integer,
	"items_out" integer,
	"outcome" text,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "macro_obs" (
	"series_id" text NOT NULL,
	"date" date NOT NULL,
	"value" double precision,
	CONSTRAINT "macro_obs_series_id_date_pk" PRIMARY KEY("series_id","date")
);
--> statement-breakpoint
CREATE TABLE "macro_series" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"unit" text,
	"frequency" text,
	"source" text NOT NULL,
	"region" text,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"symbol" text NOT NULL,
	"ts" timestamp with time zone NOT NULL,
	"price_usd" double precision NOT NULL,
	"native_price" double precision,
	"fx_rate_used" double precision DEFAULT 1 NOT NULL,
	"change" double precision,
	"change_pct" double precision,
	"open" double precision,
	"high" double precision,
	"low" double precision,
	"prev_close" double precision,
	"volume" double precision,
	"market_cap_usd" double precision,
	"provider" text NOT NULL,
	CONSTRAINT "quotes_symbol_ts_pk" PRIMARY KEY("symbol","ts")
);
--> statement-breakpoint
CREATE TABLE "recaps" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"kind" text NOT NULL,
	"body_md" text NOT NULL,
	"inputs" jsonb NOT NULL,
	"template_version" text NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"homepage" text,
	"feed_url" text,
	"kind" text NOT NULL,
	"region" text,
	"tier" text NOT NULL,
	"trust_score" integer DEFAULT 50 NOT NULL,
	"license_note" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_fetched_at" timestamp with time zone,
	"failure_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candles_daily" ADD CONSTRAINT "candles_daily_symbol_instruments_symbol_fk" FOREIGN KEY ("symbol") REFERENCES "public"."instruments"("symbol") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cluster_articles" ADD CONSTRAINT "cluster_articles_cluster_id_clusters_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."clusters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cluster_articles" ADD CONSTRAINT "cluster_articles_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "macro_obs" ADD CONSTRAINT "macro_obs_series_id_macro_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."macro_series"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_symbol_instruments_symbol_fk" FOREIGN KEY ("symbol") REFERENCES "public"."instruments"("symbol") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "articles_url_uq" ON "articles" USING btree ("url");--> statement-breakpoint
CREATE INDEX "articles_published_idx" ON "articles" USING btree ("published_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "articles_status_idx" ON "articles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "articles_tickers_gin" ON "articles" USING gin ("tickers");--> statement-breakpoint
CREATE INDEX "articles_embedding_hnsw" ON "articles" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "clusters_slug_uq" ON "clusters" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "clusters_rank_idx" ON "clusters" USING btree ("importance_score" DESC NULLS LAST,"last_updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "clusters_tickers_gin" ON "clusters" USING gin ("tickers");--> statement-breakpoint
CREATE INDEX "macro_obs_series_date_idx" ON "macro_obs" USING btree ("series_id","date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "quotes_symbol_idx" ON "quotes" USING btree ("symbol");--> statement-breakpoint
CREATE UNIQUE INDEX "recaps_slug_uq" ON "recaps" USING btree ("slug");