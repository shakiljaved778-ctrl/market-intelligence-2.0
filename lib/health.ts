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

async function readJobs(): Promise<HealthReport["jobs"]> {
  const db = getDb();
  if (!db) return [];
  const rows = await db
    .selectDistinctOn([jobRuns.job], {
      job: jobRuns.job,
      finishedAt: jobRuns.finishedAt,
      outcome: jobRuns.outcome,
    })
    .from(jobRuns)
    .orderBy(jobRuns.job, desc(jobRuns.startedAt));
  return rows.map((r) => ({
    job: r.job,
    finishedAt: iso(r.finishedAt),
    outcome: r.outcome ?? null,
  }));
}

/** Health with a hard time limit, so a slow database cannot hang a page. */
export async function readHealth(now: Date = new Date()): Promise<HealthReport> {
  const checkedAt = now.toISOString();
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000));
  let latest: Record<string, string | null> | null = null;
  let jobs: HealthReport["jobs"] = [];
  try {
    const result = await Promise.race([
      Promise.all([readLatest(), readJobs().catch(() => [])]),
      timeout,
    ]);
    if (result) [latest, jobs] = result;
  } catch {
    latest = null;
  }
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
