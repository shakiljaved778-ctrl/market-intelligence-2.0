import { NextResponse } from "next/server";
import { checkCronAuth } from "./auth";
import { runJob, type JobSummary } from "./job-runs";

/**
 * Shared handler for /api/cron/* routes (§3): authenticate with CRON_SECRET,
 * run the job wrapped in job_runs logging, return a JSON summary. A forced
 * failure (`?simulate=fail`) throws so the error is recorded in job_runs and
 * the route returns 500 — exercising the failure path end to end.
 */
export async function handleCronRoute(
  request: Request,
  job: string,
  task: () => Promise<JobSummary>,
): Promise<Response> {
  const auth = checkCronAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason ?? "unauthorized" }, { status: 401 });
  }

  const simulateFail = new URL(request.url).searchParams.get("simulate") === "fail";

  try {
    const result = await runJob(job, async () => {
      if (simulateFail) throw new Error(`forced failure for ${job}`);
      return task();
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, job, error: message }, { status: 500 });
  }
}
