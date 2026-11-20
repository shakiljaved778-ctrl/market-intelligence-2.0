import { isGccRegion, type Region } from "@/lib/curation/region";

/**
 * Filler photos (owner request, 2026-11-20: "fix all the blank spaces with
 * filler images throughout the website"). A story with no matched cover photo
 * yet gets a stock photo from a pool for its section (or the Gulf pool for a
 * Gulf markets/economy story) instead of the drawn cover. The cluster job
 * fills each pool from Pexels and stores it in KV; pages only read KV (no
 * vendor call on render). The story's own matched photo replaces the filler as
 * soon as the job finds one.
 */
export interface FillerPhoto {
  url: string;
  credit: string;
  creditUrl: string;
}

/** Photos kept per pool: enough that one page never repeats a filler. */
export const FILLER_POOL_SIZE = 30;

export const fillerKey = (pool: string) => `filler:${pool}`;

/** Searches per pool, in order (each gives up to 15 photos). */
export const FILLER_QUERIES: Record<string, string[]> = {
  gcc: ["doha skyline", "dubai skyline", "arabian gulf city"],
  markets: ["stock market", "trading screen", "financial district"],
  economy: ["shipping port containers", "business city", "economy"],
  crypto: ["bitcoin", "blockchain", "cryptocurrency"],
  realestate: ["modern architecture", "apartment buildings", "real estate"],
  world: ["world map", "city street", "globe"],
  eureka: ["science laboratory", "library books", "microscope"],
  technology: ["technology", "circuit board", "data center"],
  health: ["healthcare", "medical research", "hospital"],
  sports: ["stadium", "sports", "football"],
  entertainment: ["cinema", "concert", "theatre"],
  science: ["space", "science", "nature landscape"],
  general: ["newspaper", "city skyline", "people walking city"],
};

const GULF_POOL_SECTIONS = new Set(["markets", "economy", "realestate"]);

/** PURE: the pool a story's filler comes from. */
export function fillerPoolFor(
  section: string,
  region: Region | null | undefined,
): string {
  if (GULF_POOL_SECTIONS.has(section) && isGccRegion(region)) return "gcc";
  return section in FILLER_QUERIES ? section : "general";
}

interface Fillable {
  section: string;
  region: Region;
  imageUrl: string | null;
  imageCredit: { credit: string; creditUrl: string } | null;
}

/**
 * PURE: give every photo-less item a filler from its pool, in list order and
 * cycling through the pool, so the first FILLER_POOL_SIZE items of a pool never
 * share a photo. Items with a photo, or whose pool is empty, are unchanged.
 */
export function assignFillers<T extends Fillable>(
  items: T[],
  pools: ReadonlyMap<string, FillerPhoto[]>,
): T[] {
  const next = new Map<string, number>();
  return items.map((item) => {
    if (item.imageUrl) return item;
    const pool = fillerPoolFor(item.section, item.region);
    const photos = pools.get(pool);
    if (!photos || photos.length === 0) return item;
    const i = next.get(pool) ?? 0;
    next.set(pool, i + 1);
    const photo = photos[i % photos.length]!;
    return {
      ...item,
      imageUrl: photo.url,
      imageCredit: { credit: photo.credit, creditUrl: photo.creditUrl },
    };
  });
}
