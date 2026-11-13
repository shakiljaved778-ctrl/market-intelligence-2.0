/**
 * Server-side paging for story lists. The wire holds up to two weeks of stories
 * (lib/db/queries/wire.ts); rendering them all on one page made /news several
 * megabytes, so lists are served a page at a time through `?page=`.
 */
export const WIRE_PAGE_SIZE = 30;

export interface Page<T> {
  items: T[];
  /** 1-based, clamped to the pages that exist. */
  page: number;
  pages: number;
  total: number;
}

export function pageOf<T>(
  items: readonly T[],
  rawPage: string | number | null | undefined,
  size: number = WIRE_PAGE_SIZE,
): Page<T> {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const n = typeof rawPage === "number" ? rawPage : Number.parseInt(rawPage ?? "", 10);
  const page = Number.isFinite(n) ? Math.min(Math.max(1, Math.trunc(n)), pages) : 1;
  const start = (page - 1) * size;
  return { items: items.slice(start, start + size), page, pages, total: items.length };
}
