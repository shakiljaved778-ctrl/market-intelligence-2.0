import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MacroChart } from "@/components/economy/MacroChart";
import { readSeries } from "@/lib/economy/read";

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
        {s.source} · {s.frequency} · {s.region}
      </div>
      <h1 className="font-editorial text-text-hi mt-2 text-[27px]">{s.name}</h1>
      <div className="mt-2 flex items-baseline gap-3">
        <span className="tnum text-text-hi text-[34px]">{last?.value}</span>
        <span className="text-text-low text-[13px]">{s.unit}</span>
        <span className={`tnum text-[13px] ${delta >= 0 ? "dir-gain" : "dir-loss"}`}>
          <span aria-hidden>{delta >= 0 ? "▲" : "▼"}</span> {Math.abs(delta).toFixed(2)}{" "}
          over series
        </span>
      </div>
      <div className="border-line mt-6 border p-4">
        <MacroChart data={s.observations} />
      </div>
      <p className="text-text-low mt-3 text-[11px]">
        Currency-neutral series — levels and percentages are never converted (§7).
      </p>
    </div>
  );
}
