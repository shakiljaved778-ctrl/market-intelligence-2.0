import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import { NoData } from "@/components/market/Provenance";
import { readCalendar } from "@/lib/economy/read";

export const metadata = pageMeta(
  "/economy/calendar",
  "Economic calendar",
  "Scheduled macro releases and central-bank decisions that move global and GCC markets.",
);

function fmt(ts: string): string {
  const d = new Date(ts);
  const day = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Qatar",
    day: "numeric",
    month: "short",
  }).format(d);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Qatar",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return `${day} · ${time} AST`;
}

export default async function CalendarPage() {
  const events = await readCalendar();
  return (
    <div className="py-8">
      <h1 className="font-editorial text-text-hi text-[27px]">Economic calendar</h1>
      <p className="text-text-mid mt-1 text-[13px]">
        Scheduled macro releases and central-bank decisions, in Doha time.
      </p>
      {events.length === 0 ? (
        <div className="mt-5">
          <NoData>
            The calendar is not available yet: Mizaan does not have a calendar data
            source connected, and will not list event dates or consensus figures without
            one. Macro series with their sources are on the{" "}
            <Link href="/economy" className="hover:text-iris underline">
              Economy
            </Link>{" "}
            page.
          </NoData>
        </div>
      ) : (
        <div className="border-line mt-5 overflow-x-auto border">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-line text-text-mid border-b text-left">
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">Event</th>
                <th className="px-3 py-2 text-right font-medium">Consensus</th>
                <th className="px-3 py-2 text-right font-medium">Actual</th>
                <th className="px-3 py-2 text-right font-medium">Previous</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e, i) => (
                <tr
                  key={i}
                  className="border-line hover:bg-surface border-b last:border-b-0"
                >
                  <td className="tnum text-text-mid px-3 py-2">{fmt(e.ts)}</td>
                  <td className="text-text-hi px-3 py-2">
                    <span className="border-line text-text-low mr-2 rounded-[4px] border px-1.5 py-0.5 text-[11px]">
                      {e.kind}
                    </span>
                    {e.symbol ? (
                      <Link href={`/quote/${e.symbol}`} className="hover:text-iris">
                        {e.title}
                      </Link>
                    ) : (
                      e.title
                    )}
                  </td>
                  <td className="tnum text-text-mid px-3 py-2 text-right">
                    {e.consensus ?? "—"}
                  </td>
                  <td className="tnum text-text-hi px-3 py-2 text-right">
                    {e.actual ?? "—"}
                  </td>
                  <td className="tnum text-text-low px-3 py-2 text-right">
                    {e.previous ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {events.length > 0 ? (
        <p className="text-text-low mt-3 text-[11px]">
          Demo data — not a live calendar.
        </p>
      ) : null}
    </div>
  );
}
