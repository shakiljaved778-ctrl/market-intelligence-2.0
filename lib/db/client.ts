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

export { schema };
