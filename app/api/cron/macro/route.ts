import { handleCronRoute } from "@/lib/jobs/route";
import { macroTask } from "@/lib/jobs/tasks";

// Cron routes are dynamic and authenticated with CRON_SECRET (§3).
export const dynamic = "force-dynamic";

export function GET(request: Request): Promise<Response> {
  return handleCronRoute(request, "macro", macroTask);
}

// GitHub Actions may POST; accept both verbs.
export const POST = GET;
