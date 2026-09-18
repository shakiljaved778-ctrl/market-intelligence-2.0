import { formatAsOf } from "@/lib/market/provenance";
import type { Fundamentals } from "@/lib/providers/types";

/**
 * Key fundamentals for a quote page (§6 depth). Valuation multiples and ratios
 * are dimensionless and currency-neutral (§7). Chrome stays monochrome (§12):
 * these are facts, not price direction, so no gain/loss colour and no `--iris`
 * accent — just labels and figures. Provenance is stated honestly; a fixture is
 * labelled as a sample and never dressed up as live.
 */

/** A multiple like 24.3× (ratios). Null/negative-earnings cases show "—". */
function ratio(v: number | null): string {
  if (v === null || Number.isNaN(v)) return "—";
  return `${v.toFixed(1)}×`;
}

/** A plain ratio like 1.6 (no × suffix — leverage/liquidity). */
function plain(v: number | null): string {
  if (v === null || Number.isNaN(v)) return "—";
  return v.toFixed(2);
}

/** A percentage from a decimal (0.224 → "22.4%"). Unsigned — these are levels. */
function pct(v: number | null): string {
  if (v === null || Number.isNaN(v)) return "—";
  return `${(v * 100).toFixed(1)}%`;
}

export function FundamentalsPanel({ data }: { data: Fundamentals }) {
  const live = data.provider.toLowerCase() !== "fixture";
  const asOf = formatAsOf(data.asOf);

  const groups: { heading: string; rows: [string, string][] }[] = [
    {
      heading: "Valuation",
      rows: [
        ["P/E (TTM)", ratio(data.peRatio)],
        ["PEG", plain(data.pegRatio)],
        ["P/S", ratio(data.priceToSales)],
        ["P/B", ratio(data.priceToBook)],
      ],
    },
    {
      heading: "Profitability",
      rows: [
        ["Gross margin", pct(data.grossMargin)],
        ["Operating margin", pct(data.operatingMargin)],
        ["Net margin", pct(data.netMargin)],
        ["Return on equity", pct(data.returnOnEquity)],
      ],
    },
    {
      heading: "Balance sheet & income",
      rows: [
        ["Return on assets", pct(data.returnOnAssets)],
        ["Debt / equity", plain(data.debtToEquity)],
        ["Current ratio", plain(data.currentRatio)],
        ["Dividend yield", pct(data.dividendYield)],
      ],
    },
  ];

  return (
    <section>
      <div className="mt-8 mb-2.5 flex items-baseline justify-between">
        <h2 className="text-text-mid text-[13px] font-medium">Financials · TTM</h2>
        {live ? (
          <span className="text-text-low text-[11px]">
            Source {data.provider === "fmp" ? "FMP" : data.provider}
            {asOf ? <> · as of {asOf}</> : null}
          </span>
        ) : (
          <span className="text-text-low text-[11px]">
            <span className="border-line text-text-mid mr-1.5 rounded border px-1.5 py-0.5">
              Sample data
            </span>
            Illustrative — not live fundamentals
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {groups.map((g) => (
          <dl key={g.heading} className="list-card">
            <p className="text-text-low border-line border-b px-3.5 py-2 text-[12px]">
              {g.heading}
            </p>
            {g.rows.map(([label, value]) => (
              <div
                key={label}
                className="border-line flex items-baseline justify-between border-b px-3.5 py-2.5 last:border-b-0"
              >
                <dt className="text-text-low text-[12px]">{label}</dt>
                <dd className="tnum text-text-hi text-[14px]">{value}</dd>
              </div>
            ))}
          </dl>
        ))}
      </div>
    </section>
  );
}
