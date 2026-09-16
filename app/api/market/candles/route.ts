import { NextResponse } from "next/server";
import { z } from "zod";
import { readCandles } from "@/lib/market/read";
import { RangeSchema } from "@/lib/providers/types";

// Serves candles from cache/DB/fixtures only — never a vendor (§6).
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
  const candles = await readCandles(parsed.data.symbol, parsed.data.range);
  return NextResponse.json(
    { symbol: parsed.data.symbol.toUpperCase(), range: parsed.data.range, candles },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
  );
}
