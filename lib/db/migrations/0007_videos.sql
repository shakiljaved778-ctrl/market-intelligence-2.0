CREATE TABLE "videos" (
	"video_id" text PRIMARY KEY NOT NULL,
	"channel" text NOT NULL,
	"title" text NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"thumbnail_url" text NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "videos_published_idx" ON "videos" USING btree ("published_at" DESC NULLS LAST);