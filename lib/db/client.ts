import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Lazy DB client. The app boots with ZERO keys (§2): if POSTGRES_URL is absent,
 * `getDb()` returns null and callers fall back to fixtures. Connections are
 * created once and reused.
 */
let client: postgres.Sql | null = null;
let db: PostgresJsDatabase<typeof schema> | null = null;

export function isDbConfigured(): boolean {
  return Boolean(process.env.POSTGRES_URL);
}

export function getDb(): PostgresJsDatabase<typeof schema> | null {
  if (!isDbConfigured()) return null;
  if (db) return db;
  client = postgres(process.env.POSTGRES_URL as string, { prepare: false });
  db = drizzle(client, { schema });
  return db;
}

export { schema };
