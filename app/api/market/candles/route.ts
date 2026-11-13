import { NextResponse } from "next/server";
import { z } from "zod";
import { stampText } from "@/lib/market/provenance";
import { getSeries } from "@/lib/market/service";
import { RangeSchema } from "@/lib/providers/types";

// Serves the STORED series (cache → Postgres) with its source — never a vendor
// call and never a generated series. Empty when nothing is stored.
export const dynamic = "force-dynamic";

const Query = z.object({
  symbol: z
    .string()
    .min(1)
    .max(16)
    .regex(/^[A-Za-z0-9.\-:]+$/),
  range: RangeSchema,
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = Query.safeParse({
    symbol: url.searchParams.get("symbol") ?? "",
    range: url.searchParams.get("range") ?? "1M",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid symbol or range" }, { status: 400 });
  }
  const series = await getSeries(parsed.data.symbol, parsed.data.range);
  return NextResponse.json(
    {
      symbol: parsed.data.symbol.toUpperCase(),
      range: parsed.data.range,
      candles: series.value ?? [],
      source: series.source,
      asOf: series.asOf,
      stamp: stampText(
        {
          source: series.source,
          asOf: series.asOf?.slice(0, 10) ?? null,
          cadence: series.status === "eod" ? "daily closes" : null,
          demo: series.demo,
        },
        true,
      ),
    },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
  );
}
