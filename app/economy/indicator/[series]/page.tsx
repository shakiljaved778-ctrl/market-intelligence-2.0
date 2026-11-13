import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MacroChart } from "@/components/economy/MacroChart";
import { readSeries } from "@/lib/economy/read";
import { formatAsOf } from "@/lib/market/provenance";

interface Params {
  params: Promise<{ series: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { series } = await params;
  const s = await readSeries(decodeURIComponent(series));
  return { title: s?.name ?? "Indicator" };
}

export default async function IndicatorPage({ params }: Params) {
  const { series } = await params;
  const s = await readSeries(decodeURIComponent(series));
  if (!s) notFound();
  const last = s.observations.at(-1);
  const first = s.observations[0];
  const delta = last && first ? last.value - first.value : 0;

  return (
    <div className="py-8">
      <div className="eyebrow">
        {s.demo ? "Demo data" : s.source} · {s.frequency} · {s.region}
        {s.asOf && !s.demo ? ` · latest observation ${formatAsOf(s.asOf, true)}` : ""}
      </div>
      <h1 className="font-editorial text-text-hi mt-2 text-[27px]">{s.name}</h1>
      <div className="mt-2 flex items-baseline gap-3">
        <span className="tnum text-text-hi text-[34px]">{last?.value}</span>
        <span className="text-text-low text-[13px]">{s.unit}</span>
        <span className="tnum text-text-mid text-[13px]">
          <span aria-hidden>{delta >= 0 ? "▲" : "▼"}</span> {Math.abs(delta).toFixed(2)}{" "}
          over the charted window
        </span>
      </div>
      <div className="card mt-6 p-4">
        <MacroChart data={s.observations} variant="full" unit={s.unit} />
      </div>
      {s.method ? <p className="text-text-low mt-3 text-[11px]">{s.method}</p> : null}
      <p className="text-text-low mt-1 text-[11px]">
        Levels and percentages are never currency-converted.
      </p>
    </div>
  );
}
