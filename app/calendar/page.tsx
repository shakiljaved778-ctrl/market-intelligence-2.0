import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { instrumentBySymbol } from "@/content/instruments";
import { flag } from "@/lib/flags";
import {
  EARNINGS_AHEAD_DAYS,
  IPO_AHEAD_DAYS,
  readCalendars,
} from "@/lib/market/calendar";
import { formatAsOf } from "@/lib/market/provenance";
import { canonical } from "@/lib/seo";

/**
 * Earnings and IPO calendar (brief §5; behind NEXT_PUBLIC_FLAG_CALENDAR).
 * Read from the copy the macro job stores; never fetched on render. Every
 * figure is Finnhub's, labelled with its fetch time; nothing is estimated
 * by Mizaan. An economic calendar needs a licensed source and is not shown.
 */
export const metadata: Metadata = {
  title: "Earnings and IPO calendar",
  description:
    "Upcoming earnings for the companies Mizaan covers, and recent and upcoming IPOs — source and time on every table.",
  alternates: { canonical: canonical("/calendar") },
};

export const dynamic = "force-dynamic";

const dateLabel = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

const HOUR: Record<string, string> = {
  bmo: "Before open",
  amc: "After close",
  dmh: "During hours",
};

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-hairline text-ink-3 rounded-[10px] border px-4 py-6 text-[13px]">
      {children}
    </p>
  );
}

export default async function CalendarPage() {
  if (!flag("calendar")) notFound();
  const cal = await readCalendars();
  const stamp = cal ? `Source Finnhub · fetched ${formatAsOf(cal.fetchedAt)}` : null;

  return (
    <div className="pb-8">
      <div className="header-band bleed">
        <div className="mx-auto max-w-[1280px] px-4 py-8">
          <PageHeader
            kicker="Markets · Calendar"
            title="Earnings and IPOs"
            subtitle={`Earnings in the next ${EARNINGS_AHEAD_DAYS} days for the companies Mizaan covers, and IPOs from the past week and the next ${IPO_AHEAD_DAYS} days. Dates and estimates are the data provider's; check the company's own announcement before relying on them.`}
          />
        </div>
      </div>

      <section aria-labelledby="earnings-heading" className="mt-10">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="earnings-heading" className="t-h3 font-editorial text-ink">
            Earnings
          </h2>
          {stamp ? <p className="text-ink-3 text-[12px]">{stamp}</p> : null}
        </div>
        {!cal?.earnings ? (
          <Empty>
            The earnings calendar is not available yet. It fills in after the next data
            run.
          </Empty>
        ) : cal.earnings.length === 0 ? (
          <Empty>
            No companies Mizaan covers report in the next {EARNINGS_AHEAD_DAYS} days.
          </Empty>
        ) : (
          <div className="border-hairline overflow-x-auto rounded-[10px] border">
            <table className="w-full min-w-[560px] text-[14px]">
              <thead>
                <tr className="border-hairline text-ink-3 border-b text-left text-[12px]">
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Company</th>
                  <th className="px-4 py-2 font-medium">When</th>
                  <th className="px-4 py-2 font-medium">Quarter</th>
                  <th className="px-4 py-2 text-right font-medium">
                    EPS estimate (consensus)
                  </th>
                </tr>
              </thead>
              <tbody>
                {cal.earnings.map((e) => (
                  <tr
                    key={`${e.symbol}-${e.date}`}
                    className="border-hairline border-b last:border-0"
                  >
                    <td className="text-ink-2 px-4 py-2.5 whitespace-nowrap">
                      {dateLabel(e.date)}
                    </td>
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/quote/${e.symbol}`}
                        className="text-ink font-semibold hover:underline"
                      >
                        <span className="tnum">{e.symbol}</span>{" "}
                        <span className="text-ink-3 font-normal">
                          {instrumentBySymbol(e.symbol)?.name ?? ""}
                        </span>
                      </Link>
                    </td>
                    <td className="text-ink-2 px-4 py-2.5 whitespace-nowrap">
                      {HOUR[e.hour ?? ""] ?? "Not stated"}
                    </td>
                    <td className="tnum text-ink-2 px-4 py-2.5 whitespace-nowrap">
                      {e.quarter && e.year ? `Q${e.quarter} ${e.year}` : "—"}
                    </td>
                    <td className="tnum text-ink-2 px-4 py-2.5 text-right whitespace-nowrap">
                      {typeof e.epsEstimate === "number"
                        ? `$${e.epsEstimate.toFixed(2)}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="ipo-heading" className="mt-10">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="ipo-heading" className="t-h3 font-editorial text-ink">
            IPOs
          </h2>
          {stamp ? <p className="text-ink-3 text-[12px]">{stamp}</p> : null}
        </div>
        {!cal?.ipos ? (
          <Empty>
            The IPO calendar is not available yet. It fills in after the next data run.
          </Empty>
        ) : cal.ipos.length === 0 ? (
          <Empty>No IPOs listed for this window.</Empty>
        ) : (
          <div className="border-hairline overflow-x-auto rounded-[10px] border">
            <table className="w-full min-w-[640px] text-[14px]">
              <thead>
                <tr className="border-hairline text-ink-3 border-b text-left text-[12px]">
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Company</th>
                  <th className="px-4 py-2 font-medium">Exchange</th>
                  <th className="px-4 py-2 font-medium">Price range</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {cal.ipos.map((i) => (
                  <tr
                    key={`${i.symbol ?? i.name}-${i.date}`}
                    className="border-hairline border-b last:border-0"
                  >
                    <td className="text-ink-2 px-4 py-2.5 whitespace-nowrap">
                      {dateLabel(i.date)}
                    </td>
                    <td className="text-ink px-4 py-2.5">
                      {i.name ?? i.symbol}
                      {i.symbol ? (
                        <span className="tnum text-ink-3 ml-2 text-[12px]">
                          {i.symbol}
                        </span>
                      ) : null}
                    </td>
                    <td className="text-ink-2 px-4 py-2.5 whitespace-nowrap">
                      {i.exchange ?? "—"}
                    </td>
                    <td className="tnum text-ink-2 px-4 py-2.5 whitespace-nowrap">
                      {i.price ? `$${i.price}` : "Not stated"}
                    </td>
                    <td className="text-ink-2 px-4 py-2.5 whitespace-nowrap capitalize">
                      {i.status ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-ink-3 mt-3 text-[12px]">
          US listings from the provider&apos;s calendar. GCC listings appear in{" "}
          <Link href="/news?topic=ipo" className="underline">
            IPO news
          </Link>{" "}
          until a GCC exchange feed is licensed.
        </p>
      </section>
    </div>
  );
}
