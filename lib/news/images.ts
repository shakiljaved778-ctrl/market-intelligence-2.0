/**
 * Responsive cover photos (2026-11-27). Covers are stored as one 1200 × 627
 * Pexels URL; on a phone that is up to ~95% wasted bytes, and the homepage's
 * mobile LCP was 6–7 s. Pexels serves any width from the same URL
 * (`w` / `h` query parameters), so the browser can pick a smaller copy.
 * Other hosts are left alone (no srcset).
 */
const WIDTHS = [320, 480, 640, 960, 1200] as const;

/** PURE: a srcset for a Pexels cover URL, or null for any other host. */
export function pexelsSrcSet(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.hostname !== "images.pexels.com") return null;
  const w = Number(u.searchParams.get("w"));
  const h = Number(u.searchParams.get("h"));
  const ratio = w > 0 && h > 0 ? h / w : 627 / 1200;
  return WIDTHS.map((width) => {
    const v = new URL(u.toString());
    v.searchParams.set("w", String(width));
    v.searchParams.set("h", String(Math.round(width * ratio)));
    return `${v.toString()} ${width}w`;
  }).join(", ");
}

/** `sizes` for the common cover slots. */
export const COVER_SIZES = {
  /** A card in a grid: full width on phones, a third on wide screens. */
  card: "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  /** The compact row thumbnail (96 px wide). */
  thumb: "96px",
  /** A story page or full-width hero. */
  hero: "(min-width: 1024px) 900px, 100vw",
} as const;
