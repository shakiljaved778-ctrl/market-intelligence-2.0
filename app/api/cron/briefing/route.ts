import { handleCronRoute } from "@/lib/jobs/route";
import { buildBriefing, sendBriefing } from "@/lib/briefing";

// Mizaan Morning send job (§6). Authed with CRON_SECRET; a GitHub Action calls it
// on the real schedule (Vercel Hobby allows only one daily cron, kept for EOD).
// Env-gated: with no Resend keys it builds the briefing and reports "disabled".
export const dynamic = "force-dynamic";

export function GET(request: Request): Promise<Response> {
  const weekly = new URL(request.url).searchParams.get("weekly") === "1";
  return handleCronRoute(request, "briefing", async () => {
    const date = new Date().toISOString().slice(0, 10);
    const briefing = await buildBriefing(date, weekly);
    const result = await sendBriefing(briefing);
    return {
      itemsOut: result.sent ? 1 : 0,
      outcome: result.sent ? "ok" : "partial",
    };
  });
}

export const POST = GET;
