import { INDEX_STRIP } from "@/fixtures/indices";
import { UNIVERSE } from "@/fixtures/universe";
import type { DisplayCurrency } from "@/lib/currency/peg";
import { sessionRecap, weeklyRecap, type RecapOutput } from "./recap";

/**
 * Builds the computed session/weekly recaps deterministically from our own
 * fixture numbers (§9 Stage 5). In production these come from the cluster/eod
 * jobs writing to the `recaps` table; the generators and inputs are identical,
 * so each recap stays reproducible from its stored inputs.
 */
const DEMO_DATE = "2026-09-16";

export interface NamedRecap {
  slug: string;
  kind: "session_open" | "session_close" | "weekly";
  title: string;
  output: RecapOutput;
}

function weakestSector(): string | undefined {
  const withSector = UNIVERSE.filter((r) => r.sector);
  const worst = [...withSector].sort((a, b) => a.changePct - b.changePct)[0];
  return worst?.sector ?? undefined;
}

function topMover() {
  const m = [...UNIVERSE].sort(
    (a, b) => Math.abs(b.changePct) - Math.abs(a.changePct),
  )[0];
  return m ? { name: m.name, changePct: m.changePct } : undefined;
}

export function buildRecaps(currency: DisplayCurrency = "USD"): NamedRecap[] {
  const indices = INDEX_STRIP.filter((i) => i.region !== "GCC").map((i) => ({
    name: i.name,
    changePct: i.changePct,
  }));
  const advancers = UNIVERSE.filter((r) => r.changePct > 0).length;
  const decliners = UNIVERSE.filter((r) => r.changePct < 0).length;

  const close = sessionRecap({
    kind: "session_close",
    currency,
    date: DEMO_DATE,
    indices,
    breadth: { advancers, decliners },
    topMover: topMover(),
    weakestSector: weakestSector(),
  });

  const open = sessionRecap({
    kind: "session_open",
    currency,
    date: DEMO_DATE,
    indices,
    topMover: topMover(),
  });

  const spx = INDEX_STRIP.find((i) => i.symbol === "SPX");
  const week = weeklyRecap({
    currency,
    weekEnding: DEMO_DATE,
    index: { name: spx?.name ?? "S&P 500", changePct: (spx?.changePct ?? 0) * 3 },
    best: topMover(),
    worst: (() => {
      const w = [...UNIVERSE].sort((a, b) => a.changePct - b.changePct)[0];
      return w ? { name: w.name, changePct: w.changePct } : undefined;
    })(),
  });

  return [
    {
      slug: `session-close-${DEMO_DATE}`,
      kind: "session_close",
      title: "US session close",
      output: close,
    },
    {
      slug: `session-open-${DEMO_DATE}`,
      kind: "session_open",
      title: "US session open",
      output: open,
    },
    { slug: `weekly-${DEMO_DATE}`, kind: "weekly", title: "Weekly wrap", output: week },
  ];
}

export function listRecaps(currency?: DisplayCurrency): NamedRecap[] {
  return buildRecaps(currency);
}

export function readRecap(slug: string, currency?: DisplayCurrency): NamedRecap | null {
  return buildRecaps(currency).find((r) => r.slug === slug) ?? null;
}
