import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { jobRuns } from "@/lib/db/schema";

/**
 * job_runs logging (§8). Every scheduled job records a row: start, finish,
 * items in/out, outcome and error. A forced failure is therefore visible in
 * `job_runs` (and in the Actions run status).
 *
 * The recorder is injectable so the run state-machine is unit-testable without
 * a live database; production uses the Postgres recorder, fixture mode logs to
 * the console.
 */
export type JobOutcome = "ok" | "partial" | "error";

export interface JobSummary {
  itemsIn?: number;
  itemsOut?: number;
  outcome?: JobOutcome;
  /** Optional human-readable diagnostic, surfaced in the route JSON + logs. */
  detail?: string;
}

export interface JobRunResult extends JobSummary {
  job: string;
  outcome: JobOutcome;
  error?: string;
  durationMs: number;
}

export interface JobRecorder {
  start(job: string): Promise<number | null>;
  finish(
    id: number | null,
    fields: {
      itemsIn?: number;
      itemsOut?: number;
      outcome: JobOutcome;
      error?: string;
    },
  ): Promise<void>;
}

class PostgresRecorder implements JobRecorder {
  async start(job: string): Promise<number | null> {
    const db = getDb();
    if (!db) return null;
    const [row] = await db
      .insert(jobRuns)
      .values({ job })
      .returning({ id: jobRuns.id });
    return row?.id ?? null;
  }

  async finish(
    id: number | null,
    fields: {
      itemsIn?: number;
      itemsOut?: number;
      outcome: JobOutcome;
      error?: string;
    },
  ): Promise<void> {
    const db = getDb();
    if (!db || id === null) return;
    await db
      .update(jobRuns)
      .set({
        finishedAt: new Date(),
        itemsIn: fields.itemsIn ?? null,
        itemsOut: fields.itemsOut ?? null,
        outcome: fields.outcome,
        error: fields.error ?? null,
      })
      .where(eq(jobRuns.id, id));
  }
}

class ConsoleRecorder implements JobRecorder {
  async start(job: string): Promise<number | null> {
    console.log(`[job:${job}] start`);
    return null;
  }
  async finish(
    _id: number | null,
    fields: {
      itemsIn?: number;
      itemsOut?: number;
      outcome: JobOutcome;
      error?: string;
    },
  ): Promise<void> {
    console.log(`[job] finish`, fields);
  }
}

export function defaultRecorder(): JobRecorder {
  return getDb() ? new PostgresRecorder() : new ConsoleRecorder();
}

/**
 * Run a job, recording a job_runs row around it. On failure the row is marked
 * `error` and the error rethrown so the caller (route → 500, runner → exit 1)
 * surfaces it.
 */
export async function runJob(
  job: string,
  fn: () => Promise<JobSummary>,
  recorder: JobRecorder = defaultRecorder(),
): Promise<JobRunResult> {
  const startedAt = Date.now();
  const id = await recorder.start(job);
  try {
    const summary = await fn();
    const outcome = summary.outcome ?? "ok";
    await recorder.finish(id, {
      itemsIn: summary.itemsIn,
      itemsOut: summary.itemsOut,
      outcome,
    });
    return { job, ...summary, outcome, durationMs: Date.now() - startedAt };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await recorder.finish(id, { outcome: "error", error: message });
    throw err;
  }
}
