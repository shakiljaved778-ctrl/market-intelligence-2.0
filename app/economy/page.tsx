import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import { MacroChart } from "@/components/economy/MacroChart";
import { NoData } from "@/components/market/Provenance";
import { PageHeader } from "@/components/layout/PageHeader";
import { readCalendar, readMacroSeries, readYieldCurve } from "@/lib/economy/read";
import { formatAsOf } from "@/lib/market/provenance";

export const metadata = pageMeta(
  "/economy",
  "Economy — macro dashboard",
  "US rates, inflation and jobs from FRED, and Gulf GDP from the World Bank — each series with its source and the date of its latest observation.",
);

export default async function EconomyPage() {
  const [series, curve, calendar] = await Promise.all([
    readMacroSeries(),
    readYieldCurve(),
    readCalendar(),
  ]);
  const empty = series.length === 0 && curve.points.length === 0;

  return (
    <div className="pb-4">
      <div className="header-band bleed">
        <div className="mx-auto max-w-[1280px] px-4 py-8">
          <PageHeader
            kicker="macro · FRED + World Bank"
            title="Economy"
            subtitle="Official statistics from FRED and the World Bank. Each tile shows its source and the date of the latest observation. Levels and percentages are never currency-converted."
            action={
              calendar.length > 0 ? (
                <Link href="/economy/calendar" className="btn btn-ghost text-[13px]">
                  Calendar <span aria-hidden>→</span>
                </Link>
              ) : undefined
            }
          />
        </div>
      </div>

      {empty ? (
        <div className="mt-6">
          <NoData>
            No economic series are available right now. Tiles appear here once the data
            feed has delivered observations from FRED and the World Bank.
          </NoData>
        </div>
      ) : (
        <div
          className="fade-up mt-6 grid grid-cols-1 gap-4 md:grid-cols-2"
          style={{ "--d": "80ms" } as React.CSSProperties}
        >
          {series.map((s) => {
            const last = s.observations.at(-1);
            const first = s.observations[0];
            const delta = last && first ? last.value - first.value : 0;
            const glyph = delta > 0 ? "▲" : delta < 0 ? "▼" : "–";
            const asOf = s.asOf ? formatAsOf(s.asOf, true) : null;
            return (
              <Link
                key={s.id}
                href={`/economy/indicator/${encodeURIComponent(s.id)}`}
                className="card card-hover block p-4"
              >
                <div className="relative flex items-baseline justify-between gap-3">
                  <span className="text-text-hi text-[15px]">{s.name}</span>
                  <span className="tnum text-text-hi shrink-0 text-[17px]">
                    {last?.value}
                    <span className="text-text-low ml-1 text-[11px]">{s.unit}</span>
                  </span>
                </div>
                <div className="relative mt-0.5 flex items-center justify-between gap-2">
                  <span className="eyebrow">
                    {s.demo ? "Demo data" : s.source} · {s.frequency}
                    {asOf && !s.demo ? ` · ${asOf}` : ""}
                  </span>
                  <span
                    className="tnum text-text-mid shrink-0 text-[11px]"
                    title={`Change since ${first ? formatAsOf(first.date, true) : "the start of the charted window"}`}
                  >
                    <span aria-hidden>{glyph}</span> {Math.abs(delta).toFixed(2)}{" "}
                    {s.unit}
                  </span>
                </div>
                <div className="relative mt-3">
                  <MacroChart data={s.observations} variant="mini" unit={s.unit} />
                </div>
              </Link>
            );
          })}

          {curve.points.length > 0 ? (
            <div className="card p-4">
              <div className="relative flex items-baseline justify-between">
                <span className="text-text-hi text-[15px]">
                  US Treasury yield curve
                </span>
                <span className="eyebrow">%, by tenor</span>
              </div>
              <div className="eyebrow relative mt-0.5">
                {curve.demo
                  ? "Demo data"
                  : `${curve.source}${curve.asOf ? ` · ${formatAsOf(curve.asOf, true)}` : ""}`}
              </div>
              <div className="relative mt-3">
                <MacroChart
                  data={curve.points.map((c) => ({ date: c.tenor, value: c.yieldPct }))}
                  variant="mini"
                  unit="%"
                />
              </div>
            </div>
          ) : null}
        </div>
      )}

      {!empty ? (
        <p className="text-text-low mt-4 text-[11px]">
          The small figure on each tile is the change across the charted window. Series
          are refreshed from the source several times a day; the date shown is the
          source&rsquo;s latest observation, not the time of our refresh.
        </p>
      ) : null}
    </div>
  );
}
