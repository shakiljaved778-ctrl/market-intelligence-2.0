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
  const authed = request.headers.has("authorization") && checkCronAuth(request).ok;
  const report = await readHealth(new Date(), { withJobs: authed });
  const httpStatus = report.status === "down" ? 503 : 200;
  const headers = { "Cache-Control": "no-store" };
  if (authed) return NextResponse.json(report, { status: httpStatus, headers });
  // Names only (no data): which checks are not ok, so a monitor's alert says why.
  const issues = report.db
    ? report.pipelines
        .filter((p) => p.status !== "ok")
        .map((p) => `${p.name}: ${p.status}`)
    : ["database: no answer in time"];
  return NextResponse.json(
    { status: report.status, checkedAt: report.checkedAt, issues },
    { status: httpStatus, headers },
  );
}
