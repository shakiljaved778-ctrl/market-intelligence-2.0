import { NextResponse } from "next/server";
import { z } from "zod";
import { readWire } from "@/lib/news/read";

export const dynamic = "force-dynamic";

const Query = z.object({ q: z.string().min(1).max(64) });

/**
 * Lightweight story search for the command palette. Reads the (cached) ranked
 * wire and filters cluster titles/deks by the query. In-memory only — no vendor
 * call, no pipeline re-run beyond the per-request cache.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = Query.safeParse({ q: url.searchParams.get("q") ?? "" });
  if (!parsed.success) return NextResponse.json({ matches: [] });

  const q = parsed.data.q.toLowerCase();
  const wire = await readWire();
  const matches = wire
    .filter(
      (c) =>
        c.title.toLowerCase().includes(q) || (c.dek ?? "").toLowerCase().includes(q),
    )
    .slice(0, 6)
    .map((c) => ({
      title: c.title,
      slug: c.slug,
      section: c.section,
      score: c.importanceScore,
    }));

  return NextResponse.json(
    { matches },
    { headers: { "Cache-Control": "public, max-age=120" } },
  );
}
