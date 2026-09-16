import Link from "next/link";
import { readCalendar } from "@/lib/economy/read";

export const metadata = { title: "Calendar" };

function fmt(ts: string): string {
  const d = new Date(ts);
  return `${d.getUTCDate()} ${d.toLocaleString("en-US", { month: "short", timeZone: "UTC" })} · ${d.toISOString().slice(11, 16)}Z`;
}

export default async function CalendarPage() {
  const events = await readCalendar();
  return (
    <div className="py-8">
      <h1 className="font-editorial text-text-hi text-[27px]">Economic calendar</h1>
      <p className="text-text-mid mt-1 text-[13px]">
        Consensus versus actual for macro releases and earnings.
      </p>
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
    </div>
  );
}
