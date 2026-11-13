/**
 * Apply committed database migrations (lib/db/migrations) — safely, on any
 * database we may meet:
 *
 *   1. A database with migration history  → apply whatever is newer.
 *   2. An empty database                  → apply everything.
 *   3. A database whose tables exist but which has NO migration history (the
 *      schema was created some other way) → BASELINE first: work out, from the
 *      schema itself, which migrations are already in effect, record that, then
 *      apply only what is newer.
 *
 * Case 3 is why this script exists: `drizzle-kit migrate` on such a database
 * replays migration 0000 and stops at "relation already exists".
 *
 * Baselining never guesses. Each migration has a marker (a table or column it
 * creates); migrations are counted as applied only while every earlier marker
 * is present. A migration with no marker stops the count, and the script then
 * fails loudly rather than risk skipping or replaying something.
 *
 * Usage: POSTGRES_URL=… pnpm db:migrate
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const FOLDER = join(process.cwd(), "lib", "db", "migrations");

interface JournalEntry {
  idx: number;
  when: number;
  tag: string;
}

/** What each migration creates — used to recognise it in an existing schema. */
const MARKERS: Record<string, { table: string; column?: string }> = {
  "0000_thankful_blade": { table: "articles" },
  "0001_amused_warpath": { table: "sources", column: "slug" },
  "0002_simple_forge": { table: "clusters", column: "brief_md" },
  "0003_previous_morph": { table: "clusters", column: "cover_url" },
  "0004_add_fundamentals": { table: "fundamentals" },
  "0005_price_provenance": { table: "quotes", column: "delay_minutes" },
};

function journal(): JournalEntry[] {
  const raw = JSON.parse(
    readFileSync(join(FOLDER, "meta", "_journal.json"), "utf8"),
  ) as {
    entries: JournalEntry[];
  };
  return [...raw.entries].sort((a, b) => a.idx - b.idx);
}

async function main(): Promise<void> {
  const url = process.env.POSTGRES_URL;
  if (!url) {
    console.error("POSTGRES_URL is not set.");
    process.exit(1);
  }
  const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });

  try {
    const exists = async (table: string, column?: string): Promise<boolean> => {
      const rows = column
        ? await sql`
            select 1 from information_schema.columns
            where table_schema = 'public' and table_name = ${table}
              and column_name = ${column}`
        : await sql`
            select 1 from information_schema.tables
            where table_schema = 'public' and table_name = ${table}`;
      return rows.length > 0;
    };

    const [history] = await sql`
      select to_regclass('drizzle.__drizzle_migrations') as t`;
    let recorded = 0;
    if (history?.t) {
      const [row] =
        await sql`select count(*)::int as n from drizzle.__drizzle_migrations`;
      recorded = row?.n ?? 0;
    }

    const entries = journal();
    const first = entries[0];
    const firstMarker = first ? MARKERS[first.tag] : undefined;
    const schemaPresent = firstMarker
      ? await exists(firstMarker.table, firstMarker.column)
      : false;

    if (recorded === 0 && schemaPresent) {
      // Existing schema, no history: find the last migration already in effect.
      let baseline: JournalEntry | null = null;
      for (const entry of entries) {
        const marker = MARKERS[entry.tag];
        if (!marker) break; // cannot verify → stop counting
        if (!(await exists(marker.table, marker.column))) break;
        baseline = entry;
      }
      if (!baseline) {
        throw new Error("Could not establish a baseline for the existing schema.");
      }
      const hash = createHash("sha256")
        .update(readFileSync(join(FOLDER, `${baseline.tag}.sql`), "utf8"))
        .digest("hex");
      await sql`create schema if not exists drizzle`;
      await sql`
        create table if not exists drizzle.__drizzle_migrations (
          id serial primary key,
          hash text not null,
          created_at bigint
        )`;
      await sql`
        insert into drizzle.__drizzle_migrations (hash, created_at)
        values (${hash}, ${baseline.when})`;
      console.log(
        `Baseline recorded: existing schema matches migrations up to ${baseline.tag}.`,
      );
    } else if (recorded === 0) {
      console.log("Empty database: applying all migrations.");
    } else {
      console.log(`Migration history found (${recorded} recorded).`);
    }

    await migrate(drizzle(sql), { migrationsFolder: FOLDER });

    // Report what is now in effect, checked against the schema itself.
    const last = entries.at(-1);
    const lastMarker = last ? MARKERS[last.tag] : undefined;
    if (last && lastMarker && !(await exists(lastMarker.table, lastMarker.column))) {
      throw new Error(`Migration ${last.tag} did not take effect.`);
    }
    console.log(`Migrations applied. Schema is at ${last?.tag ?? "(none)"}.`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error("Migration failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
