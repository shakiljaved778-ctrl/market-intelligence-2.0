"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SITE_URL } from "@/lib/site";
import {
  isValidEmail,
  rateLimited,
  requestSubscription,
  signToken,
} from "@/lib/newsletter";

/**
 * Newsletter signup (Phase 6). Server action used by the signup form at the end
 * of articles and in the footer. Honeypot + per-IP rate limit; double opt-in via
 * a signed confirm link. Redirects to /newsletter with the outcome state.
 */
export async function subscribeAction(formData: FormData): Promise<void> {
  // Honeypot: a filled hidden field means a bot — pretend success.
  if (formData.get("company")) redirect("/newsletter?state=pending");

  const email = String(formData.get("email") ?? "").trim();
  const source = String(formData.get("source") ?? "unknown").slice(0, 60);

  if (!isValidEmail(email)) redirect("/newsletter?state=invalid");

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) redirect("/newsletter?state=rate_limited");

  const confirmUrl = `${SITE_URL}/api/newsletter/confirm?token=${encodeURIComponent(
    signToken(email, "confirm", source),
  )}`;
  const result = await requestSubscription(email, source, confirmUrl);
  redirect(`/newsletter?state=${result.state}`);
}
