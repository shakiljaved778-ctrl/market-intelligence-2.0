import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { flag } from "@/lib/flags";
import { buildTrackers, type Tracker } from "@/lib/news/deals";
import { readWire } from "@/lib/news/read";
import { isGccRegion, regionLabel } from "@/lib/curation/region";
import { relativeTime } from "@/lib/format/relative-time";
import { canonical } from "@/lib/seo";

/**
 * Deals hub (pre-launch brief §6; behind NEXT_PUBLIC_FLAG_DEALS): private
 * equity, IPOs, sukuk and bonds, M&A and funding rounds, each a table of
 * published stories. Every row links to its story, where the sources are
 * cited. A value is shown only when the headline or summary states one.
 */
export const metadata: Metadata = {
  title: "Deals — private equity, IPOs, sukuk, M&A and venture",
  description:
    "GCC and global deals: private equity, IPOs and listings, sukuk and bonds, mergers and funding rounds — every row linked to its sources.",
  alternates: { canonical: canonical("/deals") },
};

function TrackerTable({ tracker }: { tracker: Tracker }) {
  return (
    <section aria-labelledby={`${tracker.id}-heading`} className="mt-10">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 id={`${tracker.id}-heading`} className="t-h3 font-editorial text-ink">
          {tracker.title}
        </h2>
        <p className="text-ink-3 text-[12px]">{tracker.blurb}</p>
      </div>
      {tracker.rows.length === 0 ? (
        <p className="border-hairline text-ink-3 rounded-[10px] border px-4 py-6 text-[13px]">
          No stories in the last two weeks.
        </p>
      ) : (
        <div className="border-hairline overflow-x-auto rounded-[10px] border">
          <table className="w-full min-w-[640px] text-[14px]">
            <thead>
              <tr className="border-hairline text-ink-3 border-b text-left text-[12px]">
                <th className="px-4 py-2 font-medium">When</th>
                <th className="px-4 py-2 font-medium">Story</th>
                <th className="px-4 py-2 font-medium">Value (as stated)</th>
                <th className="px-4 py-2 font-medium">Region</th>
                <th className="px-4 py-2 font-medium">Sources</th>
              </tr>
            </thead>
            <tbody>
              {tracker.rows.map((r) => (
                <tr key={r.slug} className="border-hairline border-b last:border-0">
                  <td className="text-ink-3 px-4 py-2.5 whitespace-nowrap">
                    {relativeTime(r.eventTime)}
                  </td>
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/news/${r.slug}`}
                      className="text-ink font-sans font-semibold hover:underline"
                    >
                      {r.title}
                    </Link>
                  </td>
                  <td className="tnum text-ink-2 px-4 py-2.5 whitespace-nowrap">
                    {r.statedValue ?? <span className="text-ink-4">Not stated</span>}
                  </td>
                  <td className="text-ink-2 px-4 py-2.5 whitespace-nowrap">
                    {isGccRegion(r.region) ? regionLabel(r.region) : "Global"}
                  </td>
                  <td className="tnum ours px-4 py-2.5 whitespace-nowrap">
                    {r.sourceCount} {r.sourceCount === 1 ? "source" : "sources"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default async function DealsPage() {
  if (!flag("deals")) notFound();
  const trackers = buildTrackers(await readWire());
  return (
    <div className="pb-8">
      <div className="header-band bleed">
        <div className="mx-auto max-w-[1280px] px-4 py-8">
          <PageHeader
            kicker="Private equity · Investment banking · Venture"
            title="Deals"
            subtitle="GCC and global deals from the last two weeks. Every row is a published story with its sources; a value appears only when the headline or summary states one, exactly as written."
          />
        </div>
      </div>
      <nav aria-label="Deal sections" className="mt-6 flex flex-wrap gap-2 text-[12px]">
        {[
          ["privateequity", "Private Equity"],
          ["ibanking", "Investment Banking"],
          ["venture", "Venture Capital"],
        ].map(([id, label]) => (
          <Link
            key={id}
            href={`/news/section/${id}`}
            className="border-line text-text-mid hover:text-text-hi rounded-full border px-3 py-1"
          >
            {label} →
          </Link>
        ))}
      </nav>
      {trackers.map((t) => (
        <TrackerTable key={t.id} tracker={t} />
      ))}
    </div>
  );
}
