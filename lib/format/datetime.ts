/**
 * Human date/time in Asia/Qatar (AST) — the house timezone for published and
 * updated stamps (Phase 4 §3). Deterministic (fixed locale + timezone) so server
 * and client render the same string.
 */
const AST = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Qatar",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const AST_DATE = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Qatar",
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** e.g. "31 Oct 2026, 20:00" — caller appends " AST". */
export function formatAst(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return AST.format(d).replace(",", "");
}

/** e.g. "31 Oct 2026". */
export function formatAstDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return AST_DATE.format(d);
}
