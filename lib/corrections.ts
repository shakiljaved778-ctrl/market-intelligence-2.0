/**
 * Corrections log (Phase 4 §4). A transparent, append-only record of material
 * corrections. In production this is backed by a `corrections` table; with zero
 * keys it reads this committed list (empty to date — an honest "none yet" state).
 * The /corrections page renders whatever this returns as a simple list.
 */
export interface Correction {
  /** ISO date the correction was issued. */
  date: string;
  /** The story corrected (headline). */
  headline: string;
  /** What was wrong and what changed. */
  note: string;
  /** Optional link to the corrected story. */
  url?: string;
}

/** Committed corrections (none to date). Live mode reads the DB table instead. */
const COMMITTED: Correction[] = [];

export async function listCorrections(): Promise<Correction[]> {
  // CHECK (live): read from the `corrections` table when POSTGRES_URL is set.
  // For now the committed list is the source of truth so the page always renders.
  return [...COMMITTED].sort((a, b) => b.date.localeCompare(a.date));
}
