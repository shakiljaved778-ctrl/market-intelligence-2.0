/**
 * The canonical site URL, resolved once and always valid.
 *
 * Guards against a subtle deploy bug: a `NEXT_PUBLIC_*` var that is declared but
 * empty gets inlined as `""` (not undefined), so `?? fallback` doesn't catch it
 * and `new URL("")` throws. We therefore treat blank as absent, fall back to
 * Vercel's own `VERCEL_URL` (set automatically on every deploy), and finally to
 * localhost — so the app builds and runs with zero configuration.
 */
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit && explicit.trim()) return explicit.trim().replace(/\/$/, "");

  const vercel = process.env.VERCEL_URL;
  if (vercel && vercel.trim()) return `https://${vercel.trim()}`;

  return "http://localhost:3000";
}

export const SITE_URL = resolveSiteUrl();
