import { NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/jobs/auth";
import { readHealth } from "@/lib/health";

export const dynamic = "force-dynamic";

/**
 * GET /api/health (pre-launch audit, 2026-11-27).
 * - Public: `{ status, checkedAt }` — for an uptime monitor ("ok" = healthy).
 * - With `Authorization: Bearer $CRON_SECRET`: the full report — database
 *   reachable, each pipeline's newest data, its age and limit, and the last
 *   run of every job.
 * Returns 200 when ok or degraded, 503 when down, so a plain uptime check
 * alerts on a real outage.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const report = await readHealth();
  const httpStatus = report.status === "down" ? 503 : 200;
  const headers = { "Cache-Control": "no-store" };
  const authed = request.headers.has("authorization") && checkCronAuth(request).ok;
  if (authed) return NextResponse.json(report, { status: httpStatus, headers });
  return NextResponse.json(
    { status: report.status, checkedAt: report.checkedAt },
    { status: httpStatus, headers },
  );
}
