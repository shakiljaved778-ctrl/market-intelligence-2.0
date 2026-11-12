import { readCommodityRows, readCryptoRows, readFxRows } from "@/lib/market/levels";
import { stampText } from "@/lib/market/provenance";
import { readWire } from "@/lib/news/read";
import {
  NEWSLETTER_NAME,
  isNewsletterConfigured,
  isNewsletterEnabled,
  signToken,
} from "@/lib/newsletter";
import { SITE_URL } from "@/lib/site";

/**
 * "Mizaan Morning" briefing builder (Phase 6). Deterministic — built from the
 * same stored data the site uses, never free-form.
 *
 * Honesty rules:
 *  - Stories are the ranked stories PUBLISHED IN THE BRIEFING'S OWN WINDOW (the
 *    24 hours before 07:00 Doha on its date; 7 days for the weekly wrap) — an
 *    archive page for a past date never shows today's wire.
 *  - Market rows are real stored values, each with its source and time, and are
 *    included only on the day they describe. A past date carries none (no
 *    historical snapshot is stored), and a class with nothing real is omitted.
 */
export interface BriefingStory {
  title: string;
  slug: string;
  sourceCount: number;
}

export interface BriefingMarketRow {
  name: string;
  value: string;
  changePct: number | null;
  /** Source and time line, e.g. "ECB reference rate · 12 Nov · daily fixing". */
  stamp: string;
}

export interface Briefing {
  date: string; // YYYY-MM-DD
  slug: string;
  title: string;
  weekly: boolean;
  markets: BriefingMarketRow[];
  topStories: BriefingStory[];
}

/** 07:00 Asia/Qatar (UTC+3, no DST) on `date`, as epoch ms. */
export function briefingCutoffMs(date: string): number {
  return Date.parse(`${date}T04:00:00.000Z`);
}

function num(v: number): string {
  const dp = Math.abs(v) < 10 ? 4 : 2;
  return v.toLocaleString("en-US", {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
}

async function marketRows(): Promise<BriefingMarketRow[]> {
  const [commodities, fx, crypto] = await Promise.all([
    readCommodityRows(),
    readFxRows(),
    readCryptoRows(2),
  ]);
  const rows: BriefingMarketRow[] = [];
  for (const r of [
    ...commodities,
    ...fx.filter((f) => f.cadence !== "pegged"),
    ...crypto,
  ]) {
    if (r.demo) continue; // a briefing never carries demo values
    const stamp = stampText({ source: r.source, asOf: r.asOf, cadence: r.cadence });
    if (!stamp) continue;
    rows.push({
      name: r.name,
      value: `${num(r.value)}${r.unit ? ` ${r.unit}` : ""}`,
      changePct: r.changePct,
      stamp,
    });
  }
  return rows;
}

export async function buildBriefing(
  date: string,
  weekly = false,
  now: number = Date.now(),
): Promise<Briefing> {
  const end = briefingCutoffMs(date);
  const start = end - (weekly ? 7 : 1) * 86_400_000;
  // Today's briefing may be opened before the 07:00 cut-off; then the window is
  // "the last 24 hours up to now".
  const isCurrent = now >= start && now < end + 86_400_000;
  const upper = isCurrent ? Math.max(end, now) : end;
  const topStories = (await readWire())
    .filter((c) => {
      const t = Date.parse(c.eventTime);
      return Number.isFinite(t) && t > start && t <= upper;
    })
    .slice(0, weekly ? 8 : 5)
    .map((c) => ({ title: c.title, slug: c.slug, sourceCount: c.sourceCount }));
  return {
    date,
    slug: weekly ? `weekly-${date}` : date,
    title: `${NEWSLETTER_NAME} — ${weekly ? "Weekly wrap · " : ""}${date}`,
    weekly,
    markets: isCurrent ? await marketRows() : [],
    topStories,
  };
}

/** Recent briefing dates for the archive index (last `n` weekdays up to `from`). */
export function recentBriefingDates(from: Date, n = 7): string[] {
  const out: string[] = [];
  const d = new Date(from);
  while (out.length < n) {
    const day = d.getUTCDay();
    if (day !== 5 && day !== 6) out.push(d.toISOString().slice(0, 10)); // skip Fri/Sat (GCC weekend)
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return out;
}

// --- Email render + send (env-gated) ----------------------------------------

/** Minimal branded HTML for the briefing email (inline styles; email clients
 *  ignore external CSS). Uses the brand charcoal + caramel accent. */
export function renderBriefingHtml(b: Briefing, unsubscribeUrl: string): string {
  const idx = b.markets
    .map((m) => {
      const pct =
        m.changePct === null
          ? ""
          : `${m.changePct > 0 ? "▲ +" : m.changePct < 0 ? "▼ −" : "– "}${Math.abs(m.changePct).toFixed(2)}%`;
      const color =
        m.changePct === null || m.changePct === 0
          ? "#868d98"
          : m.changePct > 0
            ? "#4ea36b"
            : "#d16c6c";
      return `<tr><td style="padding:4px 0;color:#eceef1">${m.name}<br/><span style="color:#868d98;font-size:11px">${m.stamp}</span></td><td style="padding:4px 0;text-align:right;color:#eceef1;vertical-align:top">${m.value}</td><td style="padding:4px 0 4px 10px;text-align:right;color:${color};vertical-align:top;white-space:nowrap">${pct}</td></tr>`;
    })
    .join("");
  const stories = b.topStories
    .map(
      (s) =>
        `<li style="margin:6px 0"><a href="${SITE_URL}/news/${s.slug}" style="color:#c0875a;text-decoration:none">${s.title}</a> <span style="color:#868d98">· ${s.sourceCount} sources</span></li>`,
    )
    .join("");
  return `<div style="background:#0b0a09;color:#eceef1;font-family:Georgia,serif;padding:24px;max-width:600px;margin:0 auto">
  <div style="font-weight:700;letter-spacing:2px;font-size:20px">MIZAAN <span style="color:#868d98;font-size:12px;letter-spacing:3px">INTELLIGENCE</span></div>
  <h1 style="font-size:22px;margin:16px 0 4px">${b.title}</h1>
  ${
    idx
      ? `<h2 style="font-size:13px;color:#868d98;text-transform:uppercase;letter-spacing:1px;margin-top:20px">Markets</h2>
  <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">${idx}</table>`
      : ""
  }
  <h2 style="font-size:13px;color:#868d98;text-transform:uppercase;letter-spacing:1px;margin-top:20px">Stories that mattered</h2>
  <ul style="padding-left:18px;font-family:Arial,sans-serif;font-size:14px">${stories}</ul>
  <p style="color:#868d98;font-size:11px;margin-top:24px;font-family:Arial,sans-serif">Every figure states its source and time. Rankings are computed; summaries are AI-written from cited sources. Informational only, not investment advice.<br/><a href="${unsubscribeUrl}" style="color:#868d98">Unsubscribe</a></p>
</div>`;
}

export interface BriefingSendResult {
  sent: boolean;
  mode: "disabled" | "dryrun" | "broadcast";
}

/** Send today's briefing (env-gated). Dry-run sends only to the editor. */
export async function sendBriefing(b: Briefing): Promise<BriefingSendResult> {
  if (!isNewsletterEnabled() || !isNewsletterConfigured()) {
    return { sent: false, mode: "disabled" };
  }
  const key = process.env.RESEND_API_KEY!;
  const from =
    process.env.NEWSLETTER_FROM ?? `${NEWSLETTER_NAME} <briefing@mizaan.tech>`;
  const unsub = `${SITE_URL}/api/newsletter/unsubscribe?token=${encodeURIComponent(signToken("subscriber", "unsub"))}`;
  const html = renderBriefingHtml(b, unsub);
  const dryrun = process.env.NEWSLETTER_DRYRUN === "1";
  const headers = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };

  try {
    if (dryrun) {
      // First days: send only to the editor to proof the template.
      const to = process.env.CONTACT_INBOX ?? "editor@mizaan.tech";
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers,
        cache: "no-store",
        body: JSON.stringify({ from, to, subject: `[dry-run] ${b.title}`, html }),
      });
      return { sent: res.ok, mode: "dryrun" };
    }
    // Live: create a broadcast to the audience and send it.
    const create = await fetch("https://api.resend.com/broadcasts", {
      method: "POST",
      headers,
      cache: "no-store",
      body: JSON.stringify({
        audience_id: process.env.RESEND_AUDIENCE_ID,
        from,
        subject: b.title,
        html,
      }),
    });
    if (!create.ok) return { sent: false, mode: "broadcast" };
    const { id } = (await create.json()) as { id: string };
    const send = await fetch(`https://api.resend.com/broadcasts/${id}/send`, {
      method: "POST",
      headers,
      cache: "no-store",
    });
    return { sent: send.ok, mode: "broadcast" };
  } catch {
    return { sent: false, mode: dryrun ? "dryrun" : "broadcast" };
  }
}
