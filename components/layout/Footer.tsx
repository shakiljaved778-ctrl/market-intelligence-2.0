import Link from "next/link";
import { pegReviewedOn, QAR_PER_USD } from "@/lib/currency/peg";
import { Wordmark } from "@/components/ui/Wordmark";
import { NewsletterSignup } from "@/components/news/NewsletterSignup";
import { ColorblindToggle } from "@/components/layout/ColorblindToggle";
import { SITE } from "@/content/site.config";
import { readCalendar } from "@/lib/economy/read";

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
      { href: "/editorial-policy", label: "Editorial policy" },
      { href: "/ai-disclosure", label: "AI disclosure" },
      { href: "/corrections", label: "Corrections" },
      { href: "/contact", label: "Contact" },
      { href: "/terms", label: "Terms" },
      { href: "/privacy", label: "Privacy" },
    ],
  },
];

/**
 * Site footer: sitemap columns, newsletter signup, display settings, the data
 * and image statement, and the required disclaimer + currency-peg disclosure.
 * Copy comes from content/site.config.ts and only claims what the site does.
 */
export async function Footer({ colorblind }: { colorblind: boolean }) {
  // The calendar link is offered only while the calendar has something to show.
  const hasCalendar = (await readCalendar()).length > 0;
  const columns = COLUMNS.map((col) => ({
    ...col,
    links: col.links.filter((l) => l.href !== "/economy/calendar" || hasCalendar),
  }));
  const year = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Qatar",
    year: "numeric",
  }).format(new Date());
  return (
    <footer className="border-hairline bg-surface mt-20 border-t">
      <div className="mx-auto max-w-[1320px] px-4 py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          {/* Brand + one-line summary. */}
          <div className="col-span-2">
            <Wordmark />
            <p className="text-ink-3 mt-3 max-w-[32ch] text-[13px] leading-relaxed">
              {SITE.footerBlurb}
            </p>
          </div>
          {columns.map((col) => (
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

        {/* Newsletter signup row (§6) — one row above the legal text. */}
        <div className="border-hairline mt-10 border-t pt-6">
          <NewsletterSignup source="footer" variant="footer" />
        </div>

        {/* Display settings — labelled controls, reachable on every screen. */}
        <div className="border-hairline mt-6 flex flex-wrap items-center gap-3 border-t pt-6">
          <span className="t-micro text-ink-3">Display</span>
          <ColorblindToggle on={colorblind} />
        </div>

        <div className="border-hairline mt-6 border-t pt-6">
          <p className="text-ink-3 max-w-[68ch] text-[13px] leading-relaxed">
            <span className="text-ink-2 font-medium">Data.</span> Market and economic
            figures come from the provider named beside each one, with the time it
            refers to. Where Mizaan has no data, it says so rather than showing a
            figure. <span className="text-ink-2 font-medium">Images.</span> Covers are
            Mizaan&rsquo;s generated section art, or credited photos from Pexels.
          </p>
          <p className="text-ink-3 mt-3 max-w-[68ch] text-[13px] leading-relaxed">
            Informational purposes only. Not investment advice. Prices may be delayed or
            end-of-day, as stated beside each one. No warranty is made as to accuracy or
            completeness. QAR figures are converted from USD at the official peg (
            <span className="tnum">{QAR_PER_USD}</span> QAR = 1 USD, reviewed{" "}
            {pegReviewedOn}). Story rankings are computed from coverage and price moves;
            story summaries are AI-written from the cited sources and may contain errors
            — verify against the originals.
          </p>
          <p className="text-ink-4 mt-4 text-[12px]">
            © {year} {SITE.operator.name ?? SITE.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
