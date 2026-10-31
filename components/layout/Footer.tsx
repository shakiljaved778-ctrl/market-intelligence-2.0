import Link from "next/link";
import { pegReviewedOn, QAR_PER_USD } from "@/lib/currency/peg";
import { Wordmark } from "@/components/ui/Wordmark";

const COLUMNS: { heading: string; links: { href: string; label: string }[] }[] = [
  {
    heading: "Sections",
    links: [
      { href: "/news", label: "The wire" },
      { href: "/sections", label: "All sections" },
      { href: "/news?section=markets", label: "Markets" },
      { href: "/news?section=economy", label: "Economy" },
      { href: "/news?section=crypto", label: "Crypto" },
    ],
  },
  {
    heading: "Data",
    links: [
      { href: "/markets", label: "Markets" },
      { href: "/markets/screener", label: "Screener" },
      { href: "/economy", label: "Economy" },
      { href: "/economy/calendar", label: "Calendar" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/methodology", label: "Methodology" },
      { href: "/terms", label: "Terms" },
      { href: "/privacy", label: "Privacy" },
    ],
  },
];

/**
 * Site footer: four-column sitemap, methodology summary, data/image provider
 * credits, and the required disclaimer + currency-peg disclosure (§7, §10).
 */
export function Footer() {
  return (
    <footer className="border-hairline bg-surface mt-20 border-t">
      <div className="mx-auto max-w-[1320px] px-4 py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          {/* Brand + one-line summary. */}
          <div className="col-span-2">
            <Wordmark />
            <p className="text-ink-3 mt-3 max-w-[32ch] text-[13px] leading-relaxed">
              Signal-ranked market intelligence. Rankings are computed from coverage and
              price; story summaries are AI-written from cited sources.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <nav key={col.heading} aria-label={col.heading}>
              <h2 className="t-micro text-ink-3 mb-3">{col.heading}</h2>
              <ul className="flex flex-col gap-2">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link
                      href={l.href}
                      className="text-ink-2 hover:text-brand text-[13px] transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="border-hairline mt-10 border-t pt-6">
          <p className="text-ink-3 text-[13px]">
            <span className="text-ink-2 font-medium">Market &amp; macro data</span> from
            FMP, Finnhub, FRED and the World Bank.{" "}
            <span className="text-ink-2 font-medium">Cover images</span> from Pexels and
            on-brand generative art.
          </p>
          <p className="text-ink-3 mt-3 max-w-[68ch] text-[13px] leading-relaxed">
            Informational purposes only. Not investment advice. Market data may be
            delayed; every price states its delay and source. No warranty is made as to
            accuracy or completeness. QAR figures are converted from USD at the official
            peg (<span className="tnum">{QAR_PER_USD}</span> QAR = 1 USD, reviewed{" "}
            {pegReviewedOn}). Rankings and clustering are computed from market data;
            story summaries are AI-written from the cited sources and may contain errors
            — verify against the originals.
          </p>
        </div>
      </div>
    </footer>
  );
}
