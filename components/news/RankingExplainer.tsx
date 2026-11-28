import Link from "next/link";
import type { ImportanceBreakdown } from "@/lib/curation/rank";

/**
 * "Why this story is ranked here" (roadmap #7, 2026-11-27): the importance
 * score taken apart, from the same computation that ranks the wire. Collapsed
 * by default; shown only when the breakdown reproduces the score on the page.
 */
const LABELS: Record<ImportanceBreakdown["factors"][number]["id"], string> = {
  sources: "Independent sources",
  tier: "Source tier",
  market: "Market move",
  primary: "Primary source",
};

function detail(
  id: ImportanceBreakdown["factors"][number]["id"],
  b: ImportanceBreakdown,
  sourceCount: number,
  score: number,
): string {
  switch (id) {
    case "sources":
      return `${sourceCount} ${sourceCount === 1 ? "outlet" : "outlets"} (log scale, full at 8)`;
    case "tier":
      return "average tier: regulators and primary sources 1.0, wires 0.7, outlets 0.55";
    case "market":
      return b.maxMovePct > 0
        ? `largest move among its instruments ${b.maxMovePct.toFixed(1)}% (full at 5%)`
        : "no listed instrument moved";
    case "primary":
      return score > 0
        ? "a regulator or central bank is among the sources"
        : "no regulator or central bank among the sources";
  }
}

export function RankingExplainer({
  breakdown,
  sourceCount,
}: {
  breakdown: ImportanceBreakdown;
  sourceCount: number;
}) {
  const before = breakdown.factors.reduce((sum, f) => sum + f.points, 0);
  return (
    <details className="border-hairline mt-3 rounded-[8px] border px-4 py-2 text-[13px]">
      <summary className="text-ink-2 cursor-pointer py-1 font-medium">
        Why this story is ranked here
      </summary>
      <table className="mt-2 w-full">
        <tbody>
          {breakdown.factors.map((f) => (
            <tr key={f.id} className="border-hairline border-t">
              <td className="text-ink py-1.5 pr-3 align-top font-medium whitespace-nowrap">
                {LABELS[f.id]}
              </td>
              <td className="text-ink-3 py-1.5 pr-3 align-top">
                {detail(f.id, breakdown, sourceCount, f.score)}
              </td>
              <td className="tnum ours py-1.5 text-right align-top whitespace-nowrap">
                {f.points.toFixed(1)} / {(f.weight * 100).toFixed(0)}
              </td>
            </tr>
          ))}
          <tr className="border-hairline border-t">
            <td className="text-ink py-1.5 pr-3 font-medium">Freshness</td>
            <td className="text-ink-3 py-1.5 pr-3">
              × {breakdown.recency.toFixed(2)} — halves every 18 hours, never below 0.18
            </td>
            <td className="tnum ours py-1.5 text-right whitespace-nowrap">
              {before.toFixed(1)} × {breakdown.recency.toFixed(2)}
            </td>
          </tr>
          <tr className="border-hairline border-t">
            <td className="text-ink py-1.5 pr-3 font-semibold">Importance</td>
            <td className="text-ink-3 py-1.5 pr-3">
              computed, not chosen by an editor or a model ·{" "}
              <Link href="/methodology" className="underline underline-offset-2">
                methodology
              </Link>
            </td>
            <td className="tnum ours py-1.5 text-right font-semibold">
              {breakdown.total} / 100
            </td>
          </tr>
        </tbody>
      </table>
    </details>
  );
}
