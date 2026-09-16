import Link from "next/link";
import { MacroChart } from "@/components/economy/MacroChart";
import { PageHeader } from "@/components/layout/PageHeader";
import { readMacroSeries, readYieldCurve } from "@/lib/economy/read";

export const metadata = { title: "Economy" };

export default async function EconomyPage() {
  const [series, curve] = await Promise.all([readMacroSeries(), readYieldCurve()]);

  return (
    <div className="pb-4">
      <div className="header-band bleed">
        <div className="mx-auto max-w-[1280px] px-4 py-8">
          <PageHeader
            kicker="macro · FRED + World Bank"
            title="Economy"
            subtitle="FRED and World Bank series. Levels and percentages are currency-neutral — never converted."
            action={
              <Link href="/economy/calendar" className="btn btn-ghost text-[13px]">
                Calendar <span aria-hidden>→</span>
              </Link>
            }
          />
        </div>
      </div>

      <div
        className="fade-up mt-6 grid grid-cols-1 gap-4 md:grid-cols-2"
        style={{ "--d": "80ms" } as React.CSSProperties}
      >
        {series.map((s) => {
          const last = s.observations.at(-1);
          return (
            <Link
              key={s.id}
              href={`/economy/indicator/${encodeURIComponent(s.id)}`}
              className="card card-hover block p-4"
            >
              <div className="relative flex items-baseline justify-between">
                <span className="text-text-hi text-[15px]">{s.name}</span>
                <span className="tnum text-text-hi text-[17px]">
                  {last?.value}
                  <span className="text-text-low ml-1 text-[11px]">{s.unit}</span>
                </span>
              </div>
              <div className="eyebrow relative mt-0.5">
                {s.source} · {s.frequency} · {s.region}
              </div>
              <div className="relative mt-3">
                <MacroChart data={s.observations} />
              </div>
            </Link>
          );
        })}

        {/* Yield curve. */}
        <div className="card p-4">
          <div className="relative flex items-baseline justify-between">
            <span className="text-text-hi text-[15px]">US Treasury yield curve</span>
            <span className="eyebrow">%, by tenor</span>
          </div>
          <div className="eyebrow relative mt-0.5">FRED · fixture</div>
          <div className="relative mt-3">
            <MacroChart
              data={curve.map((c) => ({ date: c.tenor, value: c.yieldPct }))}
            />
          </div>
        </div>
      </div>

      <p className="text-text-low mt-4 text-[11px]">
        Illustrative fixtures shown when no keys are configured. Live series refresh
        every 6 hours via the macro job.
      </p>
    </div>
  );
}
