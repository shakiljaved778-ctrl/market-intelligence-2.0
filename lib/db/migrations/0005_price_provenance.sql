ALTER TABLE "candles_daily" ADD COLUMN IF NOT EXISTS "provider" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "delay_minutes" integer;