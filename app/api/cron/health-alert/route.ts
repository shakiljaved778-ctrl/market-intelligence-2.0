import { NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/jobs/auth";
import { runHealthAlert } from "@/lib/health-alert";

// Authenticated with CRON_SECRET like every cron route (§3).
export const dynamic = "force-dynamic";

/** Stale-data alert check (lib/health-alert.ts). Called by the quotes workflow. */
export async function GET(request: Request): Promise<NextResponse> {
  const auth = checkCronAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.reason }, { status: 401 });
  }
  const result = await runHealthAlert();
  return NextResponse.json(
    { ok: true, ...result },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export const POST = GET;
