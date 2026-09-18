CREATE TABLE "fundamentals" (
	"symbol" text NOT NULL,
	"ts" timestamp with time zone NOT NULL,
	"pe_ratio" double precision,
	"peg_ratio" double precision,
	"price_to_sales" double precision,
	"price_to_book" double precision,
	"gross_margin" double precision,
	"operating_margin" double precision,
	"net_margin" double precision,
	"return_on_equity" double precision,
	"return_on_assets" double precision,
	"debt_to_equity" double precision,
	"current_ratio" double precision,
	"dividend_yield" double precision,
	"payout_ratio" double precision,
	"provider" text NOT NULL,
	CONSTRAINT "fundamentals_symbol_ts_pk" PRIMARY KEY("symbol","ts")
);
--> statement-breakpoint
ALTER TABLE "fundamentals" ADD CONSTRAINT "fundamentals_symbol_instruments_symbol_fk" FOREIGN KEY ("symbol") REFERENCES "public"."instruments"("symbol") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fundamentals_symbol_idx" ON "fundamentals" USING btree ("symbol");