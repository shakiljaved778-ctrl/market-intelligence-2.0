import { runJob } from "@/lib/jobs/job-runs";
import { ingestTask } from "@/lib/jobs/tasks";

/**
 * Ingest entrypoint, executed by GitHub Actions in the runner (§3): full Node,
 * no serverless timeout. Pulls feeds, dedupes, classifies and stores headline
 * metadata (never body text). The engine lands in Phase 4; this wiring logs a
 * job_runs row and exits non-zero on failure so Actions surfaces it.
 *
 * Run: pnpm tsx jobs/ingest.ts
 */
runJob("ingest", ingestTask)
  .then((r) => {
    console.log("[ingest]", r);
    process.exit(0);
  })
  .catch((err) => {
    console.error("[ingest] failed:", err);
    process.exit(1);
  });
