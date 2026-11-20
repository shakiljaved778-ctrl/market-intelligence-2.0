import { desc, eq } from "drizzle-orm";
import { dbRead, getDb } from "@/lib/db/client";
import { originals } from "@/lib/db/schema";

export interface OriginalSource {
  title: string;
  source: string;
  url: string;
  /** Our story page for the report's cluster, when known. */
  slug: string | null;
}

export interface StoredOriginal {
  slug: string;
  kind: string;
  title: string;
  dek: string;
  bodyMd: string;
  sources: OriginalSource[];
  model: string;
  coverUrl: string | null;
  coverCredit: string | null;
  coverCreditUrl: string | null;
  publishedAt: string;
}

type Row = typeof originals.$inferSelect;
const toStored = (r: Row): StoredOriginal => ({
  slug: r.slug,
  kind: r.kind,
  title: r.title,
  dek: r.dek,
  bodyMd: r.bodyMd,
  sources: r.sources,
  model: r.model,
  coverUrl: r.coverUrl,
  coverCredit: r.coverCredit,
  coverCreditUrl: r.coverCreditUrl,
  publishedAt: r.publishedAt.toISOString(),
});

export async function persistOriginal(
  o: Omit<StoredOriginal, "publishedAt">,
): Promise<void> {
  const db = getDb();
  if (!db) return;
  // Same slug = the same hour's piece written again (e.g. under newer rules):
  // replace its content rather than silently keeping the old draft.
  await db
    .insert(originals)
    .values(o)
    .onConflictDoUpdate({
      target: originals.slug,
      set: {
        kind: o.kind,
        title: o.title,
        dek: o.dek,
        bodyMd: o.bodyMd,
        sources: o.sources,
        model: o.model,
        coverUrl: o.coverUrl,
        coverCredit: o.coverCredit,
        coverCreditUrl: o.coverCreditUrl,
      },
    });
}

/** The newest Original of a kind: when it was published and by which model/format. */
export async function latestOriginalMeta(
  kind: string,
): Promise<{ at: Date; model: string } | null> {
  const db = getDb();
  if (!db) return null;
  const rows = await db
    .select({ at: originals.publishedAt, model: originals.model })
    .from(originals)
    .where(eq(originals.kind, kind))
    .orderBy(desc(originals.publishedAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function dbLatestOriginal(kind: string): Promise<StoredOriginal | null> {
  return dbRead("dbLatestOriginal", async () => {
    const db = getDb();
    if (!db) return null;
    const rows = await db
      .select()
      .from(originals)
      .where(eq(originals.kind, kind))
      .orderBy(desc(originals.publishedAt))
      .limit(1);
    return rows[0] ? toStored(rows[0]) : null;
  });
}

export async function dbOriginalBySlug(slug: string): Promise<StoredOriginal | null> {
  return dbRead("dbOriginalBySlug", async () => {
    const db = getDb();
    if (!db) return null;
    const rows = await db
      .select()
      .from(originals)
      .where(eq(originals.slug, slug))
      .limit(1);
    return rows[0] ? toStored(rows[0]) : null;
  });
}
