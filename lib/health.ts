import { desc, eq, max } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  articles,
  fxRates,
  jobRuns,
  macroObs,
  quotes,
  videoPlaylists,
} from "@/lib/db/schema";
import { sessionFor } from "@/lib/format/session";

/**
 * Site health (pre-launch audit, 2026-11-27): how fresh each pipeline's newest
 * stored data is, against a limit that fits how often it updates. Read by
 * /api/health (public summary + protected detail) and by the "Data delayed"
 * banner. Reads only our own database — never a vendor.
 */
export type HealthStatus = "ok" | "degraded" | "down";

export interface PipelineHealth {
  name: string;
  /** Newest stored data for this pipeline (ISO), or null when none. */
  lastAt: string | null;
  ageMin: number | null;
  limitMin: number;
  status: HealthStatus;
  /** A critical pipeline's status sets the overall status. */
  critical: boolean;
}

export interface HealthReport {
  status: HealthStatus;
  checkedAt: string;
  db: boolean;
  pipelines: PipelineHealth[];
  jobs: { job: string; finishedAt: string | null; outcome: string | null }[];
}

const MIN = 60_000;

/** PURE: ok within the limit, degraded up to three times it, down beyond or never. */
export function assess(
  lastAt: string | null,
  limitMin: number,
  now: number,
): Pick<PipelineHealth, "ageMin" | "status"> {
  if (!lastAt) return { ageMin: null, status: "down" };
  const t = Date.parse(lastAt);
  if (!Number.isFinite(t)) return { ageMin: null, status: "down" };
  const ageMin = Math.max(0, Math.round((now - t) / MIN));
  const status =
    ageMin <= limitMin ? "ok" : ageMin <= limitMin * 3 ? "degraded" : "down";
  return { ageMin, status };
}

/** PURE: the worst status among critical pipelines (all fine → ok). */
export function overall(pipelines: PipelineHealth[]): HealthStatus {
  const critical = pipelines.filter((p) => p.critical);
  if (critical.some((p) => p.status === "down")) return "down";
  if (critical.some((p) => p.status !== "ok")) return "degraded";
  return "ok";
}

/**
 * PURE: the freshness limit, in minutes, for each pipeline at this moment.
 * News runs every 30 min; US prices every 15 min in the session, so outside it
 * the last close may be a weekend old; ECB fixings skip weekends and holidays.
 */
export function limitsAt(now: Date): Record<string, number> {
  const usOpen = sessionFor("NASDAQ", now).state === "open";
  return {
    news: 90,
    equities: usOpen ? 45 : 4 * 24 * 60,
    crypto: 180,
    fx: 5 * 24 * 60,
    energy: 7 * 24 * 60,
    video: 24 * 60,
  };
}

const CRITICAL = new Set(["news", "equities", "crypto", "fx"]);

function iso(v: unknown): string | null {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string" && v) return new Date(v).toISOString();
  return null;
}

async function readLatest(): Promise<Record<string, string | null> | null> {
  const db = getDb();
  if (!db) return null;
  const one = async (q: Promise<{ v: unknown }[]>) => iso((await q)[0]?.v);
  const [news, equities, crypto, fx, energy, video] = await Promise.all([
    one(db.select({ v: max(articles.publishedAt) }).from(articles)),
    one(
      db
        .select({ v: max(quotes.ts) })
        .from(quotes)
        .where(eq(quotes.symbol, "SPY")),
    ),
    one(
      db
        .select({ v: max(quotes.ts) })
        .from(quotes)
        .where(eq(quotes.symbol, "BTC")),
    ),
    one(db.select({ v: max(fxRates.date) }).from(fxRates)),
    one(
      db
        .select({ v: max(macroObs.date) })
        .from(macroObs)
        .where(eq(macroObs.seriesId, "FRED:DCOILBRENTEU")),
    ),
    one(db.select({ v: max(videoPlaylists.fetchedAt) }).from(videoPlaylists)),
  ]);
  return { news, equities, crypto, fx, energy, video };
}

/**
 * The last run of each job, from the newest 200 rows only. A DISTINCT ON over
 * the whole job log has no index to use and took over 4 s in production
 * (2026-11-27), timing out every health check.
 */
async function readJobs(): Promise<HealthReport["jobs"]> {
  const db = getDb();
  if (!db) return [];
  const rows = await db
    .select({
      job: jobRuns.job,
      finishedAt: jobRuns.finishedAt,
      outcome: jobRuns.outcome,
    })
    .from(jobRuns)
    .orderBy(desc(jobRuns.id))
    .limit(200);
  const seen = new Set<string>();
  const out: HealthReport["jobs"] = [];
  for (const r of rows) {
    if (seen.has(r.job)) continue;
    seen.add(r.job);
    out.push({ job: r.job, finishedAt: iso(r.finishedAt), outcome: r.outcome ?? null });
  }
  return out;
}

/** A promise's value, or `fallback` once `ms` has passed. */
function within<T>(p: Promise<T>, ms: number, fallback: T, label: string): Promise<T> {
  return Promise.race([
    p.catch((err: unknown) => {
      console.error(`[health] ${label} failed:`, err);
      return fallback;
    }),
    new Promise<T>((resolve) =>
      setTimeout(() => {
        console.error(`[health] ${label} timed out after ${ms} ms`);
        resolve(fallback);
      }, ms),
    ),
  ]);
}

/**
 * Health with hard time limits, so a slow database cannot hang a page. The
 * job log is read only for the protected detail view (`withJobs`).
 */
export async function readHealth(
  now: Date = new Date(),
  opts: { withJobs?: boolean } = {},
): Promise<HealthReport> {
  const checkedAt = now.toISOString();
  const [latest, jobs] = await Promise.all([
    within(readLatest(), 5000, null, "latest data"),
    opts.withJobs ? within(readJobs(), 3000, [], "job log") : Promise.resolve([]),
  ]);
  if (!latest) {
    return { status: "down", checkedAt, db: false, pipelines: [], jobs: [] };
  }
  const limits = limitsAt(now);
  const pipelines: PipelineHealth[] = Object.entries(limits).map(
    ([name, limitMin]) => ({
      name,
      lastAt: latest[name] ?? null,
      limitMin,
      critical: CRITICAL.has(name),
      ...assess(latest[name] ?? null, limitMin, now.getTime()),
    }),
  );
  return { status: overall(pipelines), checkedAt, db: true, pipelines, jobs };
}

let cached: { at: number; report: HealthReport } | null = null;

/** readHealth, reused for two minutes per server instance (for the banner). */
export async function readHealthCached(): Promise<HealthReport> {
  if (cached && Date.now() - cached.at < 2 * MIN) return cached.report;
  const report = await readHealth();
  cached = { at: Date.now(), report };
  return report;
}
