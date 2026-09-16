import { runJob } from "@/lib/jobs/job-runs";
import { clusterTask } from "@/lib/jobs/tasks";

/**
 * Cluster entrypoint, executed by GitHub Actions in the runner (§3): embeds
 * headline + dek locally with all-MiniLM-L6-v2, clusters within a rolling
 * window, ranks, and generates computed recaps. The engine lands in Phase 4;
 * this wiring logs a job_runs row and exits non-zero on failure.
 *
 * Run: pnpm tsx jobs/cluster.ts
 */
runJob("cluster", clusterTask)
  .then((r) => {
    console.log("[cluster]", r);
    process.exit(0);
  })
  .catch((err) => {
    console.error("[cluster] failed:", err);
    process.exit(1);
  });
