CREATE TABLE "originals" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"dek" text NOT NULL,
	"body_md" text NOT NULL,
	"sources" jsonb NOT NULL,
	"model" text NOT NULL,
	"cover_url" text,
	"cover_credit" text,
	"cover_credit_url" text,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "originals_slug_uq" ON "originals" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "originals_published_idx" ON "originals" USING btree ("published_at" DESC NULLS LAST);