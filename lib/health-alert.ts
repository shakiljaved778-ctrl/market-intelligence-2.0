import { EDITOR } from "./author";
import { cacheGet, cachePut } from "@/lib/cache/swr";
import { readHealth, type HealthReport, type HealthStatus } from "@/lib/health";

/**
 * Stale-data alert (pre-launch brief §3.4, 2026-11-27): email the owner when
 * /api/health reads "down" on two checks in a row, at most once every six
 * hours, and once more when it is "ok" again. Called by the quotes workflow,
 * which runs independently of the news pipeline, so a dead pipeline is still
 * noticed. Sent through Resend with the contact-form settings (no new keys).
 */
export interface AlertState {
  lastStatus: HealthStatus;
  /** When the outstanding "down" alert was sent, or null when none is open. */
  alertedAt: number | null;
}

export const REALERT_AFTER_MS = 6 * 3_600_000;
const STATE_KEY = "health:alert-state:v1";

/** PURE: whether to email now, and the state to keep. */
export function decideAlert(
  prev: AlertState | null,
  status: HealthStatus,
  now: number,
): { send: "down" | "recovered" | null; next: AlertState } {
  const alertedAt = prev?.alertedAt ?? null;
  if (status === "down") {
    const twiceInARow = prev?.lastStatus === "down";
    const due = alertedAt === null || now - alertedAt >= REALERT_AFTER_MS;
    if (twiceInARow && due)
      return { send: "down", next: { lastStatus: status, alertedAt: now } };
    return { send: null, next: { lastStatus: status, alertedAt } };
  }
  if (status === "ok" && alertedAt !== null) {
    return { send: "recovered", next: { lastStatus: status, alertedAt: null } };
  }
  return { send: null, next: { lastStatus: status, alertedAt } };
}

function describe(report: HealthReport): string {
  if (!report.db) return "- The database did not answer in time.";
  const late = report.pipelines.filter((p) => p.status !== "ok");
  if (late.length === 0) return "- Every pipeline is within its freshness limit.";
  return late
    .map(
      (p) =>
        `- ${p.name}: ${p.status}${p.ageMin === null ? " (no data stored)" : ` (newest data ${p.ageMin} min old; limit ${p.limitMin} min)`}`,
    )
    .join("\n");
}

async function sendEmail(subject: string, text: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const to = process.env.CONTACT_INBOX ?? EDITOR.email;
  const from = process.env.CONTACT_FROM ?? "Mizaan Alerts <contact@mizaan.tech>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, text }),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function runHealthAlert(now: Date = new Date()): Promise<{
  status: HealthStatus;
  sent: "down" | "recovered" | null;
  delivered: boolean;
}> {
  const report = await readHealth(now);
  const prev = await cacheGet<AlertState>(STATE_KEY);
  const { send, next } = decideAlert(prev, report.status, now.getTime());
  let delivered = false;
  if (send === "down") {
    delivered = await sendEmail(
      "Mizaan alert: site data is stale",
      `Two health checks in a row read "down" (${report.checkedAt}).\n\n${describe(report)}\n\nLive status: https://www.mizaan.tech/api/health\nThe site shows a "Some data is delayed" note while news or US prices are late.`,
    );
  } else if (send === "recovered") {
    delivered = await sendEmail(
      "Mizaan: data is fresh again",
      `The health check reads "ok" again (${report.checkedAt}).`,
    );
  }
  // Keep the alert open if the email could not be delivered, so it is retried.
  const keep =
    send === "down" && !delivered
      ? { ...next, alertedAt: prev?.alertedAt ?? null }
      : next;
  await cachePut(STATE_KEY, 7 * 24 * 3600, keep);
  return { status: report.status, sent: send, delivered };
}
