import type { CoverImage } from "@/lib/providers/pexels";

/**
 * Resolved Pexels cover images for the fixture wire, keyed by article id.
 *
 * This map is COMMITTED and populated offline by `pnpm tsx
 * scripts/fetch-cover-images.ts` (needs `PEXELS_API_KEY`). Reading it here is a
 * static import — the served site never calls Pexels on render (§17). Any id not
 * present falls back to the deterministic on-brand SVG cover
 * (components/news/CoverArt.tsx), so the site is always visual, even with the
 * map empty and zero keys configured.
 */
export const COVER_IMAGES: Record<number, CoverImage> = {};
