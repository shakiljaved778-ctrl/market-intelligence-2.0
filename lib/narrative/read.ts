import { FIXTURE_ARTICLES } from "@/fixtures/articles";
import { INDEX_STRIP, type IndexStripItem } from "@/fixtures/indices";
import { UNIVERSE } from "@/fixtures/universe";
import type { DisplayCurrency } from "@/lib/currency/peg";
import { sessionRecap, weeklyRecap, type RecapOutput } from "./recap";

/**
 * Builds the computed session/weekly recaps deterministically from our own
 * fixture numbers (§9 Stage 5). In production these come from the cluster/eod
 * jobs writing to the `recaps` table; the generators and inputs are identical,
 * so each recap stays reproducible from its stored inputs.
 *
 * The demo date tracks the NEWEST story in the wire, so the "latest session
 * recap" link always resolves to the current recap rather than a frozen date.
 */
const DEMO_DATE = (() => {
  const newest = FIXTURE_ARTICLES.reduce(
    (max, a) => (a.publishedAt > max ? a.publishedAt : max),
    "2000-01-01",
  );
  return newest.slice(0, 10); // YYYY-MM-DD
})();

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

/** A tracked index has a valid close only with a finite positive level + change. */
function indexValid(i: IndexStripItem): boolean {
  return Number.isFinite(i.level) && i.level > 0 && Number.isFinite(i.changePct);
}

export function buildRecaps(currency: DisplayCurrency = "USD"): NamedRecap[] {
  // Phase 1 §5: a session recap is published only when ≥80% of the tracked
  // (non-GCC) indices have a valid close; otherwise the day's data is too
  // incomplete to summarise honestly. GCC is excluded (EOD-only, separate rail).
  const tracked = INDEX_STRIP.filter((i) => i.region !== "GCC");
  const valid = tracked.filter(indexValid);
  const enoughValid = tracked.length > 0 && valid.length / tracked.length >= 0.8;

  const indices = valid.map((i) => ({ name: i.name, changePct: i.changePct }));
  const advancers = UNIVERSE.filter((r) => r.changePct > 0).length;
  const decliners = UNIVERSE.filter((r) => r.changePct < 0).length;

  const recaps: NamedRecap[] = [];

  if (enoughValid) {
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
    recaps.push(
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
    );
  }

  // The weekly wrap needs only its own index to be valid.
  const spx = INDEX_STRIP.find((i) => i.symbol === "SPX");
  if (spx && indexValid(spx)) {
    const week = weeklyRecap({
      currency,
      weekEnding: DEMO_DATE,
      index: { name: spx.name, changePct: spx.changePct * 3 },
      best: topMover(),
      worst: (() => {
        const w = [...UNIVERSE].sort((a, b) => a.changePct - b.changePct)[0];
        return w ? { name: w.name, changePct: w.changePct } : undefined;
      })(),
    });
    recaps.push({
      slug: `weekly-${DEMO_DATE}`,
      kind: "weekly",
      title: "Weekly wrap",
      output: week,
    });
  }

  return recaps;
}

export function listRecaps(currency?: DisplayCurrency): NamedRecap[] {
  return buildRecaps(currency);
}

export function readRecap(slug: string, currency?: DisplayCurrency): NamedRecap | null {
  return buildRecaps(currency).find((r) => r.slug === slug) ?? null;
}
