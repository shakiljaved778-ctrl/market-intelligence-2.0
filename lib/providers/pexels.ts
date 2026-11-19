import { z } from "zod";
import { swr } from "@/lib/cache/swr";
import { TTL } from "@/lib/cache/ttl";

/**
 * Pexels — free stock imagery for story cover art (§6, §13). The ONLY place a
 * Pexels fetch may target the vendor. The rate-limited search endpoint is called
 * ONLY from scheduled jobs / the backfill script (never on page render, §17) and
 * every call is cached in KV with a hard TTL (§2). The image itself is served
 * from the Pexels CDN by the browser as a plain <img> — a static asset, not a
 * data API — which Pexels explicitly permits (hotlinking is allowed).
 *
 * No key configured → returns null and callers fall back to the deterministic
 * on-brand SVG cover (components/news/CoverArt.tsx), so the site still renders
 * with zero keys.
 */
const BASE_URL = "https://api.pexels.com/v1";

/** A resolved cover image + its credit (Pexels asks that we attribute). */
export interface CoverImage {
  url: string;
  alt: string;
  credit: string;
  creditUrl: string;
}

const PhotoSchema = z.object({
  alt: z.string().nullable().optional(),
  photographer: z.string().optional(),
  photographer_url: z.string().optional(),
  src: z.object({
    landscape: z.string(),
    large: z.string().optional(),
  }),
});

const SearchSchema = z.object({
  photos: z.array(PhotoSchema).default([]),
});

export function isPexelsConfigured(): boolean {
  return Boolean(process.env.PEXELS_API_KEY);
}

// Stable pick: hash the query to an index so the same query always yields the
// same photo (deterministic, per §9 spirit), while different queries vary.
function pickIndex(query: string, length: number): number {
  if (length <= 0) return 0;
  let h = 2166136261;
  for (let i = 0; i < query.length; i += 1) {
    h ^= query.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % length;
}

/**
 * Resolve a landscape cover image for a free-text query. The search results are
 * cached per query; the photo is then picked from them by the query plus an
 * optional `seed` (the story's slug), so two stories that search the same
 * phrase ("economy finance city Doha") get different photos without another
 * request. Photos whose URL is in `exclude` (already on another recent story)
 * are skipped. Returns null when unconfigured, when every result is taken, or on
 * any failure, so callers degrade gracefully.
 */
export async function searchPexels(
  query: string,
  seed = "",
  exclude: ReadonlySet<string> = new Set(),
): Promise<CoverImage | null> {
  return (await searchPexelsPhotos(query, seed, exclude, 1))[0] ?? null;
}

/**
 * Up to `count` distinct photos for one query, in the same deterministic order
 * `searchPexels` uses — the first is the cover, the rest the story page's
 * gallery. One cached search serves them all (no extra request). Photos in
 * `exclude` are skipped; returns [] when unconfigured or on any failure.
 */
export async function searchPexelsPhotos(
  query: string,
  seed = "",
  exclude: ReadonlySet<string> = new Set(),
  count = 1,
): Promise<CoverImage[]> {
  if (!isPexelsConfigured()) return [];
  const key = process.env.PEXELS_API_KEY as string;
  const normalized = query.trim().toLowerCase();

  try {
    const { value } = await swr<CoverImage[]>(
      `pexels:covers:${normalized}`,
      TTL.coverImage,
      async () => {
        const res = await fetch(
          `${BASE_URL}/search?query=${encodeURIComponent(query)}&per_page=15&orientation=landscape`,
          { headers: { Authorization: key }, cache: "no-store" },
        );
        if (!res.ok) throw new Error(`Pexels search ${res.status}`);
        const parsed = SearchSchema.parse(await res.json());
        return parsed.photos.map((photo) => ({
          url: photo.src.landscape,
          alt: photo.alt?.trim() || query,
          credit: photo.photographer ?? "Pexels",
          creditUrl: photo.photographer_url ?? "https://www.pexels.com",
        }));
      },
    );
    if (!value || value.length === 0) return [];
    const start = pickIndex(seed ? `${normalized}#${seed}` : normalized, value.length);
    const out: CoverImage[] = [];
    for (let k = 0; k < value.length && out.length < count; k += 1) {
      const photo = value[(start + k) % value.length]!;
      if (!exclude.has(photo.url)) out.push(photo);
    }
    return out;
  } catch {
    return [];
  }
}
