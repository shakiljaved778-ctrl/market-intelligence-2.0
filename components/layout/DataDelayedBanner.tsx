import { readHealthCached, type PipelineHealth } from "@/lib/health";
import { isDemoMode } from "@/lib/demo/mode";

/**
 * "Data delayed" strip (pre-launch audit, 2026-11-27). Shown only when news or
 * in-session US prices are past their freshness limit (lib/health.ts), so a
 * stalled pipeline is admitted rather than hidden. Every figure on the page
 * still carries its own time stamp. Absent in demo mode and when all is fresh.
 */
const LABELS: Record<string, string> = {
  news: "News",
  equities: "US prices",
};

function ago(min: number): string {
  if (min < 90) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
}

export async function DataDelayedBanner() {
  if (isDemoMode()) return null;
  const report = await readHealthCached();
  // A database outage is handled by each page's own empty states.
  if (!report.db) return null;
  const late = report.pipelines.filter(
    (p): p is PipelineHealth & { ageMin: number } =>
      p.name in LABELS && p.status !== "ok" && p.ageMin !== null,
  );
  if (late.length === 0) return null;
  const parts = late.map((p) => `${LABELS[p.name]} last updated ${ago(p.ageMin)}`);
  return (
    <div role="status" className="border-hairline bg-surface-2 border-b">
      <p className="text-ink-2 mx-auto max-w-[1320px] px-4 py-1.5 text-[12px]">
        <span className="text-ink font-medium">Some data is delayed.</span>{" "}
        {parts.join(" · ")}. Every figure still shows its own time.
      </p>
    </div>
  );
}
