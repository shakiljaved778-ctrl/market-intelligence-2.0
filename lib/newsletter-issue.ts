import type { WireCluster } from "@/lib/news/read";

/**
 * "Mizaan Morning" issue (2026-11-28). Subscribers could sign up and confirm,
 * but nothing ever sent an issue. This builds the daily email from the ranked
 * wire, deterministically: the five strongest fresh stories (at most two from
 * one section), each with its headline, short description, source count and a
 * link to the story page, where the sources are cited. No model writes it.
 */
export const ISSUE_SIZE = 5;
export const ISSUE_MIN = 3;
const FRESH_HOURS = 24;
const MAX_PER_SECTION = 2;

export interface MorningIssue {
  name: string;
  subject: string;
  text: string;
  html: string;
  slugs: string[];
}

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** PURE: today's issue, or null when there are too few fresh stories to send. */
export function buildMorningIssue(
  wire: WireCluster[],
  now: number,
  siteUrl: string,
): MorningIssue | null {
  const picks: WireCluster[] = [];
  const perSection = new Map<string, number>();
  for (const c of wire) {
    if (picks.length >= ISSUE_SIZE) break;
    const t = Date.parse(c.eventTime);
    if (!Number.isFinite(t) || now - t > FRESH_HOURS * 3_600_000) continue;
    if (c.section === "eureka") continue;
    const n = perSection.get(c.section) ?? 0;
    if (n >= MAX_PER_SECTION) continue;
    perSection.set(c.section, n + 1);
    picks.push(c);
  }
  if (picks.length < ISSUE_MIN) return null;

  const day = new Date(now).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Qatar",
  });
  const dateKey = new Date(now + 3 * 3_600_000).toISOString().slice(0, 10); // Doha date
  const lead = picks[0] as WireCluster;
  const subject = `Mizaan Morning: ${lead.title}`.slice(0, 140);
  const link = (c: WireCluster) => `${siteUrl.replace(/\/$/, "")}/news/${c.slug}`;
  const sources = (c: WireCluster) =>
    `${c.sourceCount} ${c.sourceCount === 1 ? "source" : "sources"}`;
  const footer =
    "Stories are ranked by Mizaan from coverage and market moves. Summaries on the site are AI-written from the cited sources: check the sources before relying on them. Information only, not investment advice.";

  const text = [
    `Mizaan Morning · ${day}`,
    "",
    ...picks.flatMap((c, i) => [
      `${i + 1}. ${c.title}`,
      ...(c.dek ? [c.dek] : []),
      `${sources(c)} · ${link(c)}`,
      "",
    ]),
    footer,
    "",
    "Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}",
  ].join("\n");

  const html = `<!doctype html><html><body style="margin:0;background:#f6f1e9;font-family:Helvetica,Arial,sans-serif;color:#1a1714">
<div style="max-width:600px;margin:0 auto;padding:24px">
<p style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#6b625a;margin:0 0 4px">Mizaan Morning</p>
<p style="font-size:14px;color:#6b625a;margin:0 0 20px">${esc(day)}</p>
${picks
  .map(
    (c, i) => `<div style="border-top:1px solid #e4dccf;padding:16px 0">
<p style="font-size:12px;color:#8a5a30;margin:0 0 6px">${i + 1} · ${esc(sources(c))}</p>
<a href="${esc(link(c))}" style="font-size:18px;font-weight:700;line-height:1.3;color:#1a1714;text-decoration:none">${esc(c.title)}</a>
${c.dek ? `<p style="font-size:15px;line-height:1.5;color:#3d3731;margin:8px 0 0">${esc(c.dek)}</p>` : ""}
</div>`,
  )
  .join("\n")}
<p style="border-top:1px solid #e4dccf;padding-top:16px;font-size:12px;line-height:1.5;color:#6b625a">${esc(footer)}</p>
<p style="font-size:12px;color:#6b625a"><a href="${esc(siteUrl)}" style="color:#6b625a">mizaan.tech</a> · <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#6b625a">Unsubscribe</a></p>
</div></body></html>`;

  return {
    name: `Mizaan Morning ${dateKey}`,
    subject,
    text,
    html,
    slugs: picks.map((c) => c.slug),
  };
}
