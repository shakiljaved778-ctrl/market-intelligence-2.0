/**
 * Cron route auth (§3, §15). Every /api/cron/* route verifies
 * `Authorization: Bearer ${CRON_SECRET}` and returns 401 otherwise.
 *
 * When CRON_SECRET is unset (local/fixture mode), auth is intentionally open so
 * the routes are exercisable in development — production always sets the secret.
 */
export interface CronAuthResult {
  ok: boolean;
  reason?: string;
}

export function checkCronAuth(request: Request): CronAuthResult {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // No secret configured: allow in dev, but never in a deployed Vercel env.
    if (process.env.VERCEL) {
      return { ok: false, reason: "CRON_SECRET not configured" };
    }
    return { ok: true };
  }
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  // Length-first check keeps the comparison from short-circuiting on length.
  if (header.length === expected.length && timingSafeEqual(header, expected)) {
    return { ok: true };
  }
  return { ok: false, reason: "invalid or missing bearer token" };
}

function timingSafeEqual(a: string, b: string): boolean {
  let mismatch = a.length ^ b.length;
  for (let i = 0; i < a.length && i < b.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
