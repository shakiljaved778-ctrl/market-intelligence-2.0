import Link from "next/link";
import { pegReviewedOn, QAR_PER_USD } from "@/lib/currency/peg";

/**
 * Footer disclaimer (§10): informational only, not investment advice, data may
 * be delayed, no warranty. The peg is disclosed here as required (§7).
 */
export function Footer() {
  return (
    <footer className="border-line bg-surface mt-16 border-t">
      <div className="mx-auto max-w-[1280px] px-4 py-8">
        <div className="flex items-center gap-2.5">
          <span className="mark" aria-hidden />
          <span className="text-text-hi text-[15px] leading-none font-bold tracking-[0.16em]">
            MIZAA<span className="ours">N</span>
          </span>
          <span className="eyebrow ml-0.5 tracking-[0.28em]">INTELLIGENCE</span>
        </div>
        <div className="text-text-mid mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
          <Link href="/methodology" className="hover:text-text-hi">
            Methodology
          </Link>
          <Link href="/about" className="hover:text-text-hi">
            About
          </Link>
          <Link href="/terms" className="hover:text-text-hi">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-text-hi">
            Privacy
          </Link>
        </div>
        <p className="text-text-low mt-4 max-w-[68ch] text-[12px] leading-relaxed">
          Informational purposes only. Not investment advice. Market data may be
          delayed; every price states its delay and source. No warranty is made as to
          accuracy or completeness. QAR figures are converted from USD at the official
          peg (<span className="tnum">{QAR_PER_USD}</span> QAR = 1 USD, reviewed{" "}
          {pegReviewedOn}). Rankings and clustering are computed from market data; story
          summaries are AI-written from the cited sources and may contain errors —
          verify against the originals.
        </p>
      </div>
    </footer>
  );
}
