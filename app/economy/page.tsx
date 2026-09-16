import Link from "next/link";
import { MacroChart } from "@/components/economy/MacroChart";
import { readMacroSeries, readYieldCurve } from "@/lib/economy/read";

export const metadata = { title: "Economy" };

export default async function EconomyPage() {
  const [series, curve] = await Promise.all([readMacroSeries(), readYieldCurve()]);

  return (
    <div className="py-8">
      <div className="flex items-center justify-between">
        <h1 className="font-editorial text-text-hi text-[27px]">Economy</h1>
        <Link
          href="/economy/calendar"
          className="text-iris text-[13px] hover:underline"
        >
          Calendar
        </Link>
      </div>
      <p className="text-text-mid mt-1 text-[13px]">
        FRED and World Bank series. Levels and percentages are currency-neutral — never
        converted.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {series.map((s) => {
          const last = s.observations.at(-1);
          return (
            <Link
              key={s.id}
              href={`/economy/indicator/${encodeURIComponent(s.id)}`}
              className="border-line hover:bg-surface block border p-4 transition-colors"
            >
              <div className="flex items-baseline justify-between">
                <span className="text-text-hi text-[15px]">{s.name}</span>
                <span className="tnum text-text-hi text-[17px]">
                  {last?.value}
                  <span className="text-text-low ml-1 text-[11px]">{s.unit}</span>
                </span>
              </div>
              <div className="eyebrow mt-0.5">
                {s.source} · {s.frequency} · {s.region}
              </div>
              <div className="mt-3">
                <MacroChart data={s.observations} />
              </div>
            </Link>
          );
        })}

        {/* Yield curve. */}
        <div className="border-line border p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-text-hi text-[15px]">US Treasury yield curve</span>
            <span className="eyebrow">%, by tenor</span>
          </div>
          <div className="eyebrow mt-0.5">FRED · fixture</div>
          <div className="mt-3">
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
