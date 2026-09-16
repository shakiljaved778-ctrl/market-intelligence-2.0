import { NextResponse } from "next/server";
import { z } from "zod";
import { searchSymbols } from "@/lib/market/search";

export const dynamic = "force-dynamic";

const Query = z.object({ q: z.string().min(1).max(32) });

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = Query.safeParse({ q: url.searchParams.get("q") ?? "" });
  if (!parsed.success) {
    return NextResponse.json({ matches: [] });
  }
  const matches = await searchSymbols(parsed.data.q);
  return NextResponse.json(
    { matches },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
