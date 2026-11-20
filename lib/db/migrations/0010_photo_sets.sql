CREATE TABLE "photo_sets" (
	"key" text PRIMARY KEY NOT NULL,
	"photos" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
