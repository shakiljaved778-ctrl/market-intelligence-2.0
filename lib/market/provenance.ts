import type { Quote } from "@/lib/providers/types";

/**
 * Provenance of a single price (§10 trust invariant). Every figure we show must
 * be able to say *where it came from* and *when*. This turns a normalised Quote
 * into the honest labels the UI renders: is it real market data or an
 * illustrative sample, which source, as of when, and how delayed.
 *
 * The distinguishing marker is `quote.provider`: the scheduled jobs write the
 * real vendor name ("finnhub", "twelvedata", …); fixtures write "fixture". We
 * never dress a fixture up as live.
 */
export interface Provenance {
  /** True = real market data from a vendor; false = illustrative sample. */
  live: boolean;
  /** Human source label: "Finnhub", "Twelve Data", or "Sample data". */
  source: string;
  /** Compact UTC timestamp, e.g. "18 Sep 2026, 14:32 UTC", or null when unknown. */
  asOf: string | null;
  /** Delay label: null = real-time, "delayed 15 min", "end-of-day", "delayed 2h". */
  delay: string | null;
}

const SOURCE_LABELS: Record<string, string> = {
  fixture: "Sample data",
  finnhub: "Finnhub",
  twelvedata: "Twelve Data",
  twelve_data: "Twelve Data",
  frankfurter: "Frankfurter",
  fred: "FRED",
};

function sourceLabel(provider: string): string {
  const key = provider.trim().toLowerCase();
  if (SOURCE_LABELS[key]) return SOURCE_LABELS[key];
  // Fall back to a Title-cased version of whatever the job recorded.
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

/** Delay in minutes → an honest, human label. */
export function delayLabel(minutes: number): string | null {
  if (minutes <= 0) return null;
  if (minutes >= 1440) return "end-of-day";
  if (minutes < 60) return `delayed ${minutes} min`;
  const hours = Math.round(minutes / 60);
  return `delayed ${hours}h`;
}

/** ISO timestamp → "18 Sep 2026, 14:32 UTC", or null when unparseable. */
export function formatAsOf(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const date = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(d);
  return `${date}, ${time} UTC`;
}

export function provenanceOf(quote: Quote): Provenance {
  const live = quote.provider.toLowerCase() !== "fixture";
  return {
    live,
    source: sourceLabel(quote.provider),
    asOf: formatAsOf(quote.asOf),
    delay: delayLabel(quote.dataDelayMinutes),
  };
}

/** One-line provenance string for tooltips / titles. */
export function provenanceTitle(quote: Quote): string {
  const p = provenanceOf(quote);
  const parts = [p.live ? p.source : "Illustrative sample — not live market data"];
  if (p.asOf) parts.push(`as of ${p.asOf}`);
  if (p.delay) parts.push(p.delay);
  else if (p.live) parts.push("real-time");
  return parts.join(" · ");
}
