ALTER TABLE "sources" ADD COLUMN "slug" text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "sources_slug_uq" ON "sources" USING btree ("slug");