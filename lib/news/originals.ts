import { isDbConfigured } from "@/lib/db/client";
import { checkExclusion } from "@/lib/curation/exclusions";
import {
  dbLatestOriginal,
  dbOriginalBySlug,
  type StoredOriginal,
} from "@/lib/db/queries/originals";

/** A Mizaan Original leads the homepage only while it is this fresh. */
export const ORIGINAL_MAX_AGE_H = 36;

const allowed = (o: StoredOriginal) =>
  !checkExclusion({ texts: [o.title, o.dek, o.bodyMd] }).excluded;

/** The current lead piece, or null (none stored, stale, excluded or DB down). */
export async function readLatestOriginal(
  now = Date.now(),
): Promise<StoredOriginal | null> {
  if (!isDbConfigured()) return null;
  try {
    const o = await dbLatestOriginal("global-markets");
    if (!o || !allowed(o)) return null;
    return now - Date.parse(o.publishedAt) <= ORIGINAL_MAX_AGE_H * 3_600_000 ? o : null;
  } catch (err) {
    console.error("[originals] read failed:", err);
    return null;
  }
}

/** One Original for its page (any age — existing URLs keep working). */
export async function readOriginal(slug: string): Promise<StoredOriginal | null> {
  if (!isDbConfigured()) return null;
  try {
    const o = await dbOriginalBySlug(slug);
    return o && allowed(o) ? o : null;
  } catch (err) {
    console.error("[originals] read failed:", err);
    return null;
  }
}
