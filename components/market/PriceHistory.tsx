import { ChangePill } from "@/components/market/ChangePill";
import { NoData } from "@/components/market/Provenance";
import { formatMoney } from "@/lib/format/currency";
import type { DisplayCurrency } from "@/lib/currency/peg";
import type { PriceHistory as History } from "@/lib/market/history";
import { sourceLabel } from "@/lib/market/provenance";

const DAY = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const fmtDay = (ymd: string) => DAY.format(new Date(`${ymd}T00:00:00Z`));

/**
 * Historical figures on the quote page (owner request, 2026-11-19): period
 * returns, the 52-week range and the latest daily sessions — all computed from
 * STORED end-of-day bars (lib/market/history.ts) and stamped with their source.
 * With no stored history it says so; it never shows a sample figure.
 */
export function PriceHistory({
  name,
  history,
  source,
  currency,
}: {
  name: string;
  history: History;
  source: string | null;
  currency: DisplayCurrency;
}) {
  if (history.sessions.length === 0) {
    return (
      <>
        <h2 className="text-text-mid mt-8 mb-2.5 text-[13px] font-medium">
          Price history
        </h2>
        <NoData>
          No daily price history is stored for {name} yet. It is filled from the
          end-of-day job once its data feed delivers it.
        </NoData>
      </>
    );
  }
  const money = (v: number) => formatMoney(v, currency);
  return (
    <section aria-labelledby="price-history-heading">
      <h2
        id="price-history-heading"
        className="text-text-mid mt-8 mb-2.5 text-[13px] font-medium"
      >
        Price history
      </h2>
      <dl className="list-card grid grid-cols-2 sm:grid-cols-4">
        {history.returns.map((r) => (
          <div key={r.period} className="border-line border-r border-b px-3.5 py-3">
            <dt className="text-text-low text-[12px]">{r.period} return</dt>
            <dd className="mt-0.5 text-[15px]">
              <ChangePill pct={r.pct} />
            </dd>
          </div>
        ))}
        <div className="border-line border-r border-b px-3.5 py-3">
          <dt className="text-text-low text-[12px]">52-wk high</dt>
          <dd className="tnum text-text-hi mt-0.5 text-[15px]">
            {history.high52w != null ? money(history.high52w) : "—"}
          </dd>
        </div>
        <div className="border-line border-r border-b px-3.5 py-3">
          <dt className="text-text-low text-[12px]">52-wk low</dt>
          <dd className="tnum text-text-hi mt-0.5 text-[15px]">
            {history.low52w != null ? money(history.low52w) : "—"}
          </dd>
        </div>
      </dl>

      <div className="list-card mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] text-[13px]">
          <caption className="sr-only">
            {name} daily prices, latest {history.sessions.length} sessions
          </caption>
          <thead>
            <tr className="text-text-low border-line border-b text-left text-[12px]">
              <th scope="col" className="px-3.5 py-2 font-normal">
                Date
              </th>
              <th scope="col" className="px-3.5 py-2 text-right font-normal">
                Open
              </th>
              <th scope="col" className="px-3.5 py-2 text-right font-normal">
                High
              </th>
              <th scope="col" className="px-3.5 py-2 text-right font-normal">
                Low
              </th>
              <th scope="col" className="px-3.5 py-2 text-right font-normal">
                Close
              </th>
              <th scope="col" className="px-3.5 py-2 text-right font-normal">
                Change
              </th>
              <th scope="col" className="px-3.5 py-2 text-right font-normal">
                Volume
              </th>
            </tr>
          </thead>
          <tbody className="divide-line divide-y">
            {history.sessions.map((s) => (
              <tr key={s.date}>
                <th
                  scope="row"
                  className="text-text-mid px-3.5 py-2 text-left font-normal"
                >
                  {fmtDay(s.date)}
                </th>
                <td className="tnum text-text-hi px-3.5 py-2 text-right">
                  {money(s.o)}
                </td>
                <td className="tnum text-text-hi px-3.5 py-2 text-right">
                  {money(s.h)}
                </td>
                <td className="tnum text-text-hi px-3.5 py-2 text-right">
                  {money(s.l)}
                </td>
                <td className="tnum text-text-hi px-3.5 py-2 text-right">
                  {money(s.c)}
                </td>
                <td className="px-3.5 py-2 text-right">
                  <ChangePill pct={s.changePct} />
                </td>
                <td className="tnum text-text-mid px-3.5 py-2 text-right">
                  {s.v != null ? s.v.toLocaleString("en-US") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-ink-3 mt-1.5 text-[11px]">
        End-of-day bars{source ? ` · ${sourceLabel(source)}` : ""} · stored history{" "}
        {history.firstDate ? fmtDay(history.firstDate) : ""} –{" "}
        {history.lastDate ? fmtDay(history.lastDate) : ""}. Returns run from the first
        stored close in each period to the latest close.
      </p>
    </section>
  );
}
