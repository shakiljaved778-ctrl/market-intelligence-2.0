import { handleCronRoute } from "@/lib/jobs/route";
import { eodTask } from "@/lib/jobs/tasks";

// Cron routes are dynamic and authenticated with CRON_SECRET (§3).
export const dynamic = "force-dynamic";

export function GET(request: Request): Promise<Response> {
  return handleCronRoute(request, "eod", eodTask);
}

// GitHub Actions may POST; accept both verbs.
export const POST = GET;
