import { inArray, sql } from "drizzle-orm";
import { dbRead, getDb } from "@/lib/db/client";
import { photoSets } from "@/lib/db/schema";

export interface StoredPhoto {
  url: string;
  credit: string;
  creditUrl: string;
}

/**
 * Stored photo sets by key (filler pools, Eureka covers). Postgres, not KV:
 * the cluster job (GitHub Actions) and the pages (Vercel) share the database,
 * so what the job writes is always what the pages read (2026-11-20).
 */
export async function dbPhotoSets(keys: string[]): Promise<Map<string, StoredPhoto[]>> {
  const out = new Map<string, StoredPhoto[]>();
  if (keys.length === 0) return out;
  return dbRead("dbPhotoSets", async () => {
    const db = getDb();
    if (!db) return out;
    const rows = await db
      .select({ key: photoSets.key, photos: photoSets.photos })
      .from(photoSets)
      .where(inArray(photoSets.key, keys));
    for (const r of rows) out.set(r.key, r.photos);
    return out;
  });
}

/** Keys whose set exists, is non-empty and was written within `maxAgeS`. */
export async function freshPhotoSetKeys(
  keys: string[],
  maxAgeS: number,
): Promise<Set<string>> {
  const fresh = new Set<string>();
  const db = getDb();
  if (!db || keys.length === 0) return fresh;
  const since = new Date(Date.now() - maxAgeS * 1000);
  const rows = await db
    .select({
      key: photoSets.key,
      photos: photoSets.photos,
      updatedAt: photoSets.updatedAt,
    })
    .from(photoSets)
    .where(inArray(photoSets.key, keys));
  for (const r of rows) {
    if (r.photos.length > 0 && r.updatedAt >= since) fresh.add(r.key);
  }
  return fresh;
}

export async function persistPhotoSet(
  key: string,
  photos: StoredPhoto[],
): Promise<void> {
  const db = getDb();
  if (!db || photos.length === 0) return;
  await db
    .insert(photoSets)
    .values({ key, photos })
    .onConflictDoUpdate({
      target: photoSets.key,
      set: { photos: sql`excluded.photos`, updatedAt: sql`now()` },
    });
}
