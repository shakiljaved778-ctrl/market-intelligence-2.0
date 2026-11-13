import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Lazy DB client. The app boots with ZERO keys (§2): if POSTGRES_URL is absent,
 * `getDb()` returns null and callers fall back to fixtures. Connections are
 * created once per serverless instance and reused.
 *
 * Serverless connection discipline: on Vercel every warm function instance keeps
 * its own postgres.js pool, and they all share Supabase's connection pooler
 * (session mode caps at 15 clients). postgres.js defaults to a pool of 10, so a
 * few concurrent instances (a cron run + page renders) exhaust the pooler
 * ("EMAXCONNSESSION: max clients reached"). We therefore hold at most ONE
 * connection per instance and let it idle out quickly — the scheduled jobs loop
 * sequentially, so a single connection is sufficient, and pages queue briefly
 * rather than opening a fan-out of sockets. For real headroom, point
 * POSTGRES_URL at Supabase's *transaction* pooler (port 6543); `prepare: false`
 * already makes us compatible with it.
 */
let client: postgres.Sql | null = null;
let db: PostgresJsDatabase<typeof schema> | null = null;

export function isDbConfigured(): boolean {
  return Boolean(process.env.POSTGRES_URL);
}

export function getDb(): PostgresJsDatabase<typeof schema> | null {
  if (!isDbConfigured()) return null;
  if (db) return db;
  client = postgres(process.env.POSTGRES_URL as string, {
    prepare: false, // required for Supabase's pgbouncer transaction/session pooler
    max: 1, // one socket per serverless instance → never exhausts the shared pooler
    idle_timeout: 20, // seconds; release the socket back to the pooler promptly
    max_lifetime: 60 * 5, // recycle long-lived sockets (serverless-friendly)
    connect_timeout: 10,
  });
  db = drizzle(client, { schema });
  return db;
}

/**
 * Drop the current connection so the next query opens a fresh socket. Used
 * when a read times out: a stalled socket would otherwise hold every later
 * query on this instance (the pool has a single connection).
 */
export function resetDb(): void {
  const old = client;
  client = null;
  db = null;
  if (old) void old.end({ timeout: 0 }).catch(() => {});
}

/** A page-side database read did not finish in time, or was skipped. */
export class DbUnavailableError extends Error {}

/** Page reads must answer within this budget, or the page renders without them. */
export const READ_TIMEOUT_MS = 3_000;
/** After a timeout, skip reads on this instance for this long, then retry. */
export const READ_BREAKER_MS = 30_000;
let breakerUntil = 0;

/**
 * Run a PAGE-SIDE read with a hard time limit.
 *
 * A page must never wait on the database indefinitely. If the read takes longer
 * than READ_TIMEOUT_MS, it is abandoned with a DbUnavailableError (callers
 * already treat a failed read as "no data" and render an empty state), the
 * connection is reset, and for READ_BREAKER_MS this instance skips database
 * reads immediately instead of making each one wait out its own timeout.
 *
 * Scheduled jobs do not use this: their writes are allowed to take longer.
 */
export async function dbRead<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (Date.now() < breakerUntil) {
    throw new DbUnavailableError(
      `[db] ${label} skipped: database recently unresponsive`,
    );
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new DbUnavailableError(`[db] ${label} timed out after ${READ_TIMEOUT_MS}ms`),
        ),
      READ_TIMEOUT_MS,
    );
  });
  try {
    return await Promise.race([fn(), timeout]);
  } catch (err) {
    if (err instanceof DbUnavailableError) {
      breakerUntil = Date.now() + READ_BREAKER_MS;
      console.error(err.message);
      resetDb();
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Test seam: clear the read breaker. */
export function __resetDbReadBreaker(): void {
  breakerUntil = 0;
}

export { schema };
