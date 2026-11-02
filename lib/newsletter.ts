import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Newsletter — "Mizaan Morning" (Phase 6). Double opt-in via Resend, env-gated so
 * it is completely inert (and never sends) until keys are set. No new dependency —
 * plain fetch against the Resend REST API.
 *
 * Env (CHECK before launch):
 *   RESEND_API_KEY      — Resend key (server-only)
 *   RESEND_AUDIENCE_ID  — the "Mizaan Subscribers" audience id
 *   NEWSLETTER_FROM     — e.g. "Mizaan Morning <briefing@mizaan.tech>"
 *   NEWSLETTER_SECRET   — HMAC secret for opt-in/unsubscribe tokens (falls back to CRON_SECRET)
 *   NEWSLETTER_ENABLED  — kill switch: "0"/"false" disables signup + sends
 *   NEWSLETTER_DRYRUN   — "1" sends the briefing only to the editor for the first days
 */

export const NEWSLETTER_NAME = "Mizaan Morning";

export function isNewsletterConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_AUDIENCE_ID);
}

export function isNewsletterEnabled(): boolean {
  const flag = process.env.NEWSLETTER_ENABLED;
  return flag !== "0" && flag !== "false";
}

function secret(): string {
  return (
    process.env.NEWSLETTER_SECRET ?? process.env.CRON_SECRET ?? "mizaan-dev-secret"
  );
}

// --- Signed tokens (opt-in confirm + unsubscribe) ---------------------------

type TokenAction = "confirm" | "unsub";
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function b64url(s: string): string {
  return Buffer.from(s).toString("base64url");
}

export function signToken(email: string, action: TokenAction, source = ""): string {
  const payload = `${action}:${email.toLowerCase()}:${source}:${Date.now()}`;
  const enc = b64url(payload);
  const sig = createHmac("sha256", secret()).update(enc).digest("base64url");
  return `${enc}.${sig}`;
}

export interface TokenData {
  action: TokenAction;
  email: string;
  source: string;
}

export function verifyToken(token: string): TokenData | null {
  const [enc, sig] = token.split(".");
  if (!enc || !sig) return null;
  const expected = createHmac("sha256", secret()).update(enc).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const [action, email, source, ts] = Buffer.from(enc, "base64url")
    .toString()
    .split(":");
  if ((action !== "confirm" && action !== "unsub") || !email || !ts) return null;
  if (Date.now() - Number(ts) > TOKEN_TTL_MS) return null;
  return { action, email, source: source ?? "" };
}

export function isValidEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

// --- Naive per-process rate limit (Phase 9 replaces with a KV limiter) -------

const hits = new Map<string, number[]>();
export function rateLimited(ip: string, max = 5, windowMs = 3600_000): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > max;
}

// --- Resend REST (env-gated) -------------------------------------------------

async function resend(path: string, init: RequestInit): Promise<Response | null> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  try {
    return await fetch(`https://api.resend.com${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch {
    return null;
  }
}

export type SubscribeResult =
  | { ok: true; state: "pending" }
  | { ok: false; state: "invalid" | "unavailable" | "rate_limited" | "error" };

/** Step 1: send the double-opt-in confirmation email. */
export async function requestSubscription(
  email: string,
  source: string,
  confirmUrl: string,
): Promise<SubscribeResult> {
  if (!isValidEmail(email)) return { ok: false, state: "invalid" };
  if (!isNewsletterEnabled() || !isNewsletterConfigured()) {
    return { ok: false, state: "unavailable" };
  }
  const from =
    process.env.NEWSLETTER_FROM ?? `${NEWSLETTER_NAME} <briefing@mizaan.tech>`;
  const res = await resend("/emails", {
    method: "POST",
    body: JSON.stringify({
      from,
      to: email,
      subject: `Confirm your ${NEWSLETTER_NAME} subscription`,
      text: `Thanks for signing up to ${NEWSLETTER_NAME}. Confirm your subscription:\n\n${confirmUrl}\n\nIf you didn't request this, ignore this email.`,
    }),
  });
  return res && res.ok ? { ok: true, state: "pending" } : { ok: false, state: "error" };
}

/** Step 2: add the confirmed contact to the audience with its signup source. */
export async function confirmSubscription(
  email: string,
  source: string,
): Promise<boolean> {
  const id = process.env.RESEND_AUDIENCE_ID;
  if (!id) return false;
  const res = await resend(`/audiences/${id}/contacts`, {
    method: "POST",
    body: JSON.stringify({ email, unsubscribed: false, first_name: source }),
  });
  return Boolean(res && res.ok);
}

export async function unsubscribe(email: string): Promise<boolean> {
  const id = process.env.RESEND_AUDIENCE_ID;
  if (!id) return false;
  const res = await resend(`/audiences/${id}/contacts/${encodeURIComponent(email)}`, {
    method: "PATCH",
    body: JSON.stringify({ unsubscribed: true }),
  });
  return Boolean(res && res.ok);
}
