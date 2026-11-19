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

/** Page reads must answer within this budget on the first attempt. */
export const READ_TIMEOUT_MS = 3_000;
/**
 * Budget for the single retry after a timeout or a dropped connection. The
 * first attempt often fails because the database or its pooler is waking from
 * idle (a cold connection); by the retry it is usually awake, so the retry gets
 * more time rather than the page giving up and rendering empty.
 */
export const READ_RETRY_TIMEOUT_MS = 6_000;
/** After a read fails twice, skip reads on this instance for this long, then retry. */
export const READ_BREAKER_MS = 30_000;
let breakerUntil = 0;

/** postgres.js / socket error codes that mean "the connection failed", not "the query is wrong". */
const CONNECTION_ERROR_CODES = new Set([
  "CONNECTION_ENDED",
  "CONNECTION_DESTROYED",
  "CONNECTION_CLOSED",
  "CONNECT_TIMEOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EPIPE",
  "57P01", // admin_shutdown
  "57P03", // cannot_connect_now
]);

/** A timeout, or an error that means the connection (not the query) failed. */
export function isConnectionFailure(err: unknown): boolean {
  if (err instanceof DbUnavailableError) return true;
  const code = (err as { code?: unknown } | null)?.code;
  return typeof code === "string" && CONNECTION_ERROR_CODES.has(code);
}

async function withTimeout<T>(
  label: string,
  fn: () => Promise<T>,
  ms: number,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new DbUnavailableError(`[db] ${label} timed out after ${ms}ms`)),
      ms,
    );
  });
  try {
    return await Promise.race([fn(), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Run a PAGE-SIDE read with a hard time limit.
 *
 * A page must never wait on the database indefinitely, but it must not give up
 * on a cold connection either (that is how the homepage rendered "No new
 * stories" after an idle spell or a deploy). So:
 *
 *  1. The read gets READ_TIMEOUT_MS.
 *  2. If it times out, or its connection drops, the connection is replaced
 *     (only on our own timeout — a dropped connection was already replaced by
 *     whoever dropped it) and the read is tried ONCE more with
 *     READ_RETRY_TIMEOUT_MS.
 *  3. If the retry also fails that way, the read fails with DbUnavailableError
 *     (callers render an empty state or their last good data) and for
 *     READ_BREAKER_MS this instance skips reads immediately.
 *
 * Any other error (a bad query) is passed straight through, without a retry.
 * Scheduled jobs do not use this: their writes are allowed to take longer.
 */
export async function dbRead<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (Date.now() < breakerUntil) {
    throw new DbUnavailableError(
      `[db] ${label} skipped: database recently unresponsive`,
    );
  }
  try {
    return await withTimeout(label, fn, READ_TIMEOUT_MS);
  } catch (first) {
    if (!isConnectionFailure(first)) throw first;
    console.warn(
      `[db] ${label}: ${first instanceof Error ? first.message : String(first)}; retrying once`,
    );
    if (first instanceof DbUnavailableError) resetDb();
  }
  try {
    return await withTimeout(label, fn, READ_RETRY_TIMEOUT_MS);
  } catch (err) {
    if (!isConnectionFailure(err)) throw err;
    breakerUntil = Date.now() + READ_BREAKER_MS;
    console.error(
      `[db] ${label} failed after a retry: ${err instanceof Error ? err.message : String(err)}`,
    );
    if (err instanceof DbUnavailableError) resetDb();
    throw err instanceof DbUnavailableError
      ? err
      : new DbUnavailableError(`[db] ${label}: connection failed after a retry`);
  }
}

/** Test seam: clear the read breaker. */
export function __resetDbReadBreaker(): void {
  breakerUntil = 0;
}

export { schema };
