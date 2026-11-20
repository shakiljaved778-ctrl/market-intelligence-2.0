CREATE TABLE "video_playlists" (
	"channel" text PRIMARY KEY NOT NULL,
	"list_id" text NOT NULL,
	"latest_video_id" text NOT NULL,
	"latest_title" text NOT NULL,
	"thumbnail_url" text NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
