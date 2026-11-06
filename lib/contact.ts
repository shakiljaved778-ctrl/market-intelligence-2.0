import { EDITOR } from "./author";

/**
 * Contact-form delivery (Phase 4 §4). Sends via Resend's REST API when
 * configured; a no-op (reports "unconfigured") otherwise, so the form degrades
 * to "email us directly". No new dependency — plain fetch.
 *
 * Env (CHECK before launch):
 *   RESEND_API_KEY   — Resend key (server-only)
 *   CONTACT_INBOX    — where enquiries are delivered (defaults to the editor email)
 *   CONTACT_FROM     — a verified Resend sender, e.g. "Mizaan <contact@mizaan.tech>"
 */
export interface ContactInput {
  name: string;
  email: string;
  message: string;
}

export type ContactResult =
  | { ok: true }
  | { ok: false; reason: "unconfigured" | "invalid" | "send_failed" };

export function isContactConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendContactEmail(input: ContactInput): Promise<ContactResult> {
  const name = input.name.trim().slice(0, 200);
  const email = input.email.trim().slice(0, 320);
  const message = input.message.trim().slice(0, 5000);
  if (!email || !message || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, reason: "invalid" };
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, reason: "unconfigured" };

  const to = process.env.CONTACT_INBOX ?? EDITOR.email;
  const from = process.env.CONTACT_FROM ?? `Mizaan Contact <contact@mizaan.tech>`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        reply_to: email,
        subject: `Mizaan contact — ${name || email}`,
        text: `From: ${name} <${email}>\n\n${message}`,
      }),
      cache: "no-store",
    });
    return res.ok ? { ok: true } : { ok: false, reason: "send_failed" };
  } catch {
    return { ok: false, reason: "send_failed" };
  }
}
