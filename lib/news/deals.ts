import type { WireCluster } from "@/lib/news/read";

/**
 * Deal trackers for /deals (pre-launch brief §6, behind NEXT_PUBLIC_FLAG_DEALS).
 * Every row is a published story with its own sources; nothing is estimated.
 * A deal value is shown only when the headline or its summary STATES one, and
 * then exactly as written ("$500 Million", "QAR 3 Billion").
 */
export interface DealRow {
  slug: string;
  title: string;
  eventTime: string;
  /** The amount as the headline or summary states it, or null. */
  statedValue: string | null;
  region: WireCluster["region"];
  sourceCount: number;
}

export interface Tracker {
  id: string;
  title: string;
  blurb: string;
  rows: DealRow[];
}

const AMOUNT =
  /(?:US\$|USD|QAR|QR|SAR|AED|EUR|GBP|\$|€|£)\s?\d[\d,]*(?:\.\d+)?(?:\s?(?:billion|million|bn|mn|m|b)\b)?/i;

/** PURE: the first amount stated in the text, verbatim, or null. */
export function statedValue(...texts: (string | null | undefined)[]): string | null {
  for (const t of texts) {
    const m = t?.match(AMOUNT);
    if (m) return m[0].trim();
  }
  return null;
}

const SUKUK_OR_BOND = /\b(sukuk|bonds?|notes|debt issuance|issuance)\b/i;
const MAX_ROWS = 15;
/** The page promises "the last two weeks"; the trackers enforce it. */
export const TRACKER_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

function toRow(c: WireCluster): DealRow {
  return {
    slug: c.slug,
    title: c.title,
    eventTime: c.eventTime,
    statedValue: statedValue(c.title, c.dek),
    region: c.region,
    sourceCount: c.sourceCount,
  };
}

const newest = (a: WireCluster, b: WireCluster) =>
  Date.parse(b.eventTime) - Date.parse(a.eventTime);

/** PURE: the five trackers on /deals, each newest first. */
export function buildTrackers(
  clusters: WireCluster[],
  now: number = Date.now(),
): Tracker[] {
  const recent = clusters.filter(
    (c) => now - Date.parse(c.eventTime) <= TRACKER_WINDOW_MS,
  );
  const pick = (pred: (c: WireCluster) => boolean) =>
    recent.filter(pred).sort(newest).slice(0, MAX_ROWS).map(toRow);
  const ib = (c: WireCluster) => c.section === "ibanking";
  return [
    {
      id: "private-equity",
      title: "Private equity deals",
      blurb:
        "Buyouts, fundraises and exits, including sovereign and family-office deals.",
      rows: pick((c) => c.section === "privateequity"),
    },
    {
      id: "ipos",
      title: "IPOs and listings",
      blurb: "Initial public offerings, listings and follow-ons, GCC and global.",
      rows: pick((c) => ib(c) && c.topics.includes("ipo")),
    },
    {
      id: "sukuk-bonds",
      title: "Sukuk and bond issuance",
      blurb: "Debt capital markets — a major Gulf angle.",
      rows: pick((c) => ib(c) && SUKUK_OR_BOND.test(c.title)),
    },
    {
      id: "mergers",
      title: "Mergers and acquisitions",
      blurb: "Takeovers, mergers and stake sales.",
      rows: pick((c) => ib(c) && c.topics.includes("mergers")),
    },
    {
      id: "funding",
      title: "Funding rounds",
      blurb: "Startup rounds, venture funds and Gulf startup programmes.",
      rows: pick((c) => c.section === "venture"),
    },
  ];
}
