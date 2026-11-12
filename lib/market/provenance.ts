/**
 * Provenance of a price (trust invariant): every figure states WHERE it came
 * from and WHEN, and how delayed it is. This module turns the fields a stored
 * value carries into the one honest line the UI prints beside it.
 *
 * Times are shown in Doha time (AST, UTC+3) — the house timezone — so a reader
 * in the Gulf can judge freshness at a glance.
 */
export interface StampInput {
  /** Provider id as stored ("finnhub", "ecb") or an already-human label. */
  source: string | null;
  /** ISO timestamp, or a YYYY-MM-DD date for daily observations. */
  asOf: string | null;
  /** Feed delay in minutes at fetch time; null when not applicable. */
  delayMinutes?: number | null;
  /** "eod" marks a last close / end-of-day value. */
  status?: "ok" | "eod" | "unavailable";
  /** Extra cadence qualifier, e.g. "daily fixing", "pegged". */
  cadence?: string | null;
  /** True only under DEMO_MODE. */
  demo?: boolean;
}

const SOURCE_LABELS: Record<string, string> = {
  finnhub: "Finnhub",
  fmp: "FMP",
  polygon: "Polygon",
  eodhd: "EODHD",
  coingecko: "CoinGecko",
  alphavantage: "Alpha Vantage",
  twelvedata: "Twelve Data",
  twelve_data: "Twelve Data",
  frankfurter: "ECB reference rate",
  ecb: "ECB reference rate",
  fred: "FRED",
  worldbank: "World Bank",
  stored: "Stored series",
  demo: "Demo data",
  fixture: "Demo data",
};

export function sourceLabel(provider: string): string {
  const key = provider.trim().toLowerCase();
  if (SOURCE_LABELS[key]) return SOURCE_LABELS[key];
  // Already a human label ("FRED (EIA)") or an unknown id: show as recorded.
  return /[A-Z ]/.test(provider)
    ? provider
    : provider.charAt(0).toUpperCase() + provider.slice(1);
}

/** Delay in minutes → an honest, human label (null = no stated delay). */
export function delayLabel(minutes: number): string | null {
  if (minutes <= 0) return null;
  if (minutes >= 1440) return "end of day";
  if (minutes < 60) return `${minutes} min delayed`;
  const hours = Math.round(minutes / 60);
  return `${hours}h delayed`;
}

const DATE = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Qatar",
  day: "numeric",
  month: "short",
});
const DATE_YEAR = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Qatar",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const TIME = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Qatar",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const DAY_ONLY = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
});
const DAY_ONLY_YEAR = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
  year: "numeric",
});

/**
 * "12 Nov, 17:45 AST" for a timestamp; "12 Nov" for a date-only observation
 * (a daily fixing has no meaningful clock time). `withYear` adds the year.
 */
export function formatAsOf(asOf: string, withYear = false): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
    const d = new Date(`${asOf}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime())) return null;
    return (withYear ? DAY_ONLY_YEAR : DAY_ONLY).format(d);
  }
  const d = new Date(asOf);
  if (Number.isNaN(d.getTime())) return null;
  return `${(withYear ? DATE_YEAR : DATE).format(d)}, ${TIME.format(d)} AST`;
}

/** The qualifier after source and time: delay, close, or cadence. */
function qualifier(s: StampInput): string | null {
  if (s.cadence) return s.cadence;
  const delay = s.delayMinutes ?? 0;
  if (delay >= 1440) return "end of day";
  if (s.status === "eod") return delay > 0 ? `close, ${delayLabel(delay)}` : "close";
  return delayLabel(delay);
}

/**
 * The stamp printed beside a price, e.g.
 *   "Finnhub · 12 Nov, 17:45 AST"
 *   "FMP · 12 Nov, 17:30 AST · 15 min delayed"
 *   "ECB reference rate · 12 Nov · daily fixing"
 * Returns null when there is nothing real to stamp.
 */
export function stampText(s: StampInput, withYear = false): string | null {
  if (s.demo) return "Demo data — not market data";
  if (!s.source || !s.asOf) return null;
  const parts = [sourceLabel(s.source)];
  const when = formatAsOf(s.asOf, withYear);
  if (when) parts.push(when);
  const q = qualifier(s);
  if (q) parts.push(q);
  return parts.join(" · ");
}

/**
 * One stamp for a whole table: the distinct sources and the time range covered.
 * Used under movers / screener / heatmap so the surface states its provenance
 * even when the per-row stamp is collapsed.
 */
export function summaryStamp(rows: StampInput[]): string | null {
  const real = rows.filter((r) => !r.demo && r.source && r.asOf);
  if (rows.length > 0 && real.length === 0 && rows.some((r) => r.demo)) {
    return "Demo data — not market data";
  }
  if (real.length === 0) return null;
  const sources = [...new Set(real.map((r) => sourceLabel(r.source as string)))];
  const times = real.map((r) => r.asOf as string).sort();
  const first = formatAsOf(times[0] as string);
  const last = formatAsOf(times.at(-1) as string);
  const span = first === last ? last : `${first} to ${last}`;
  const delayed = real.some((r) => (r.delayMinutes ?? 0) > 0);
  return `Source ${sources.join(", ")} · prices as of ${span}${delayed ? " · some delayed" : ""}`;
}

/** A short stamp for dense rails (the ticker): "Finnhub 12 Nov, 17:45 AST". */
export function compactStamp(s: StampInput): string | null {
  if (s.demo) return "Demo data";
  if (!s.source || !s.asOf) return null;
  const label = sourceLabel(s.source)
    .replace(" reference rate", "")
    .replace(/ \(.*\)$/, "");
  const when = formatAsOf(s.asOf);
  return when ? `${label} ${when}` : label;
}
