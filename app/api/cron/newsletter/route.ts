import { NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/jobs/auth";
import { readWire } from "@/lib/news/read";
import { buildMorningIssue } from "@/lib/newsletter-issue";
import { sendIssue } from "@/lib/newsletter";
import { SITE_URL } from "@/lib/site";

// Authenticated with CRON_SECRET like every cron route (§3).
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily "Mizaan Morning" send (newsletter.yml). `?preview=1` returns the issue
 * without sending it, so it can be checked first.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const auth = checkCronAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.reason }, { status: 401 });
  }
  const issue = buildMorningIssue(await readWire(), Date.now(), SITE_URL);
  const headers = { "Cache-Control": "no-store" };
  if (new URL(request.url).searchParams.get("preview") === "1") {
    return NextResponse.json({ ok: true, preview: issue }, { headers });
  }
  if (!issue) {
    return NextResponse.json(
      { ok: true, sent: false, reason: "no_issue" },
      { headers },
    );
  }
  const result = await sendIssue(issue);
  console.log(`[newsletter] ${JSON.stringify({ name: issue.name, ...result })}`);
  return NextResponse.json(
    { ok: result.sent || result.reason !== "error", ...result, name: issue.name },
    { headers, status: result.sent || result.reason !== "error" ? 200 : 502 },
  );
}

export const POST = GET;
