import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge middleware (Phase 9 §2): protects the PUBLIC data API routes
 * (/api/market/*, /api/wire/*) with a per-IP rate limit and blocks empty /
 * known-scraper user agents. Internal routes (/api/cron/*) have their own
 * CRON_SECRET auth; /api/og and /api/newsletter/* are exempt here.
 *
 * The limiter is in-memory per edge instance — a solid baseline; a KV-backed
 * limiter (Upstash) is the durable upgrade when KV is configured.
 */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 60; // 60 req/min for data routes

const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear(); // crude memory cap
  return recent.length > MAX_PER_WINDOW;
}

const SCRAPER_UA =
  /(python-requests|scrapy|curl\/|wget|httpclient|go-http-client|libwww|java\/|node-fetch|axios\/|bot\b|crawler|spider)/i;

export function middleware(req: NextRequest) {
  const ua = req.headers.get("user-agent") ?? "";
  if (!ua || SCRAPER_UA.test(ua)) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const ip =
    (req.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return new NextResponse("Too Many Requests", {
      status: 429,
      headers: { "Retry-After": "60" },
    });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/market/:path*", "/api/wire/:path*"],
};
