import { NextResponse } from "next/server";
import { z } from "zod";
import { getQuote } from "@/lib/market/quote";

/**
 * GET /api/market/quote?symbol=AAPL
 *
 * Reads through the SWR cache (§6): the first call may hit a provider, the
 * second is served from cache. Never calls a vendor on a page render — this is
 * an API surface, and the cache is what lets a 60/min tier serve everyone.
 */
export const dynamic = "force-dynamic";

const Query = z.object({
  symbol: z
    .string()
    .min(1)
    .max(16)
    .regex(/^[A-Za-z0-9.\-:]+$/, "invalid symbol"),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = Query.safeParse({ symbol: url.searchParams.get("symbol") ?? "" });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "symbol is required", detail: parsed.error.issues },
      { status: 400 },
    );
  }

  const quote = await getQuote(parsed.data.symbol);
  if (!quote) {
    return NextResponse.json({ error: "symbol not found" }, { status: 404 });
  }

  return NextResponse.json(
    { quote },
    { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } },
  );
}
