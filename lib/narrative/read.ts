import type { DisplayCurrency } from "@/lib/currency/peg";
import { dbRecap, dbRecentRecaps, type StoredRecap } from "@/lib/db/queries/market";
import { demo } from "@/lib/demo/fixtures";
import { isDemoMode } from "@/lib/demo/mode";
import { shiftFixtureDate } from "@/lib/demo/clock";
import { sessionRecap, weeklyRecap, type RecapOutput } from "./recap";

/**
 * Read layer for the computed recaps. In production a recap exists ONLY if the
 * end-of-day job built it from real stored closes and persisted it (with the
 * inputs that reproduce it) to the `recaps` table. When the day's data was too
 * thin, nothing was written and nothing is shown. The fixture-built recaps
 * below run only under DEMO_MODE=1.
 */
export interface NamedRecap {
  slug: string;
  kind: "session_open" | "session_close" | "weekly";
  title: string;
  output: RecapOutput;
  /** The session date the recap describes (YYYY-MM-DD). */
  date: string;
  /** Source/provenance line for the numbers behind the recap. */
  basis: string | null;
  generatedAt: string | null;
  demo: boolean;
}

const TITLES: Record<NamedRecap["kind"], string> = {
  session_close: "US session close",
  session_open: "US session open",
  weekly: "Weekly wrap",
};

function dateFromSlug(slug: string): string {
  return slug.match(/(\d{4}-\d{2}-\d{2})$/)?.[1] ?? "";
}

interface StoredInputs {
  coverage?: { priced: number; tracked: number };
  sources?: string[];
}

function fromStored(r: StoredRecap): NamedRecap | null {
  if (r.kind === "instrument") return null;
  const inputs = (r.inputs ?? {}) as StoredInputs;
  const basis =
    inputs.coverage && inputs.sources
      ? `Computed from closing prices of ${inputs.coverage.priced} of ${inputs.coverage.tracked} tracked US equities · source ${inputs.sources.join(", ")}`
      : null;
  return {
    slug: r.slug,
    kind: r.kind,
    title: TITLES[r.kind],
    output: {
      bodyMd: r.bodyMd,
      templateVersion: r.templateVersion,
      inputs: r.inputs,
    },
    date: dateFromSlug(r.slug),
    basis,
    generatedAt: r.generatedAt,
    demo: false,
  };
}

// ── Demo-mode recaps (fixtures) ──────────────────────────────────────────────

function demoRecaps(currency: DisplayCurrency): NamedRecap[] {
  const articles = demo.articles();
  const universe = demo.universe();
  const strip = demo.indexStrip();
  if (articles.length === 0 || universe.length === 0) return [];
  const newest = articles.reduce(
    (max, a) => (a.publishedAt > max ? a.publishedAt : max),
    "2000-01-01",
  );
  const date = shiftFixtureDate(newest).slice(0, 10);
  const indices = strip
    .filter((i) => i.region !== "GCC" && i.level > 0)
    .map((i) => ({ name: i.name, changePct: i.changePct }));
  const top = [...universe].sort(
    (a, b) => Math.abs(b.changePct) - Math.abs(a.changePct),
  )[0];
  const worst = [...universe].sort((a, b) => a.changePct - b.changePct)[0];
  const topMover = top ? { name: top.name, changePct: top.changePct } : undefined;
  const base = { date, basis: "Demo data", generatedAt: null, demo: true };
  const out: NamedRecap[] = [
    {
      ...base,
      slug: `session-close-${date}`,
      kind: "session_close",
      title: TITLES.session_close,
      output: sessionRecap({
        kind: "session_close",
        currency,
        date,
        indices,
        breadth: {
          advancers: universe.filter((r) => r.changePct > 0).length,
          decliners: universe.filter((r) => r.changePct < 0).length,
        },
        topMover,
        weakestSector: worst?.sector ?? undefined,
      }),
    },
    {
      ...base,
      slug: `session-open-${date}`,
      kind: "session_open",
      title: TITLES.session_open,
      output: sessionRecap({ kind: "session_open", currency, date, indices, topMover }),
    },
  ];
  const spx = strip.find((i) => i.symbol === "SPX");
  if (spx) {
    out.push({
      ...base,
      slug: `weekly-${date}`,
      kind: "weekly",
      title: TITLES.weekly,
      output: weeklyRecap({
        currency,
        weekEnding: date,
        index: { name: spx.name, changePct: spx.changePct * 3 },
        best: topMover,
        worst: worst ? { name: worst.name, changePct: worst.changePct } : undefined,
      }),
    });
  }
  return out;
}

export async function listRecaps(
  currency: DisplayCurrency = "USD",
): Promise<NamedRecap[]> {
  try {
    const stored = (await dbRecentRecaps())
      .map(fromStored)
      .filter((r): r is NamedRecap => r !== null);
    if (stored.length > 0) return stored;
  } catch (err) {
    console.error("[recap] stored read failed:", err);
  }
  return isDemoMode() ? demoRecaps(currency) : [];
}

export async function readRecap(
  slug: string,
  currency: DisplayCurrency = "USD",
): Promise<NamedRecap | null> {
  try {
    const stored = await dbRecap(slug);
    const named = stored ? fromStored(stored) : null;
    if (named) return named;
  } catch (err) {
    console.error("[recap] stored read failed:", err);
  }
  return isDemoMode()
    ? (demoRecaps(currency).find((r) => r.slug === slug) ?? null)
    : null;
}
