/**
 * The canonical site URL, resolved once and ALWAYS a valid absolute URL.
 *
 * This must never throw and never yield an unparseable value, because it feeds
 * `new URL()` in the layout's metadataBase during the build. We defend against
 * every shape an env var can take on a deploy:
 *   - a `NEXT_PUBLIC_*` var declared but empty inlines as "" (not undefined),
 *     so `?? fallback` won't catch it;
 *   - a value without a protocol ("mizan.com") makes `new URL()` throw;
 *   - stray whitespace.
 * Order: explicit NEXT_PUBLIC_SITE_URL → Vercel's VERCEL_URL → localhost.
 */
function normalize(raw: string | undefined): string | null {
  if (!raw) return null;
  let s = raw.trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`; // add protocol if missing
  try {
    return new URL(s).origin;
  } catch {
    return null;
  }
}

// The production custom domain. Used for canonical URLs / metadataBase when no
// explicit NEXT_PUBLIC_SITE_URL is set, so links point at the real domain rather
// than the generated *.vercel.app host.
const PROD_URL = "https://www.mizaan.tech";

function resolveSiteUrl(): string {
  const isProd = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
  return (
    normalize(process.env.NEXT_PUBLIC_SITE_URL) ??
    (isProd ? PROD_URL : null) ??
    normalize(process.env.VERCEL_URL) ??
    "http://localhost:3000"
  );
}

export const SITE_URL = resolveSiteUrl();
