import { provenanceOf } from "@/lib/market/provenance";
import type { Quote } from "@/lib/providers/types";

/**
 * Honest per-price provenance (§10 trust invariant). Chrome-neutral by design
 * (§12): provenance is metadata, so it never uses the gain/loss data colours or
 * the `--iris` "ours" accent — just hairline borders and muted text. Every price
 * we surface can state its source, its timestamp and its delay; a sample is
 * always labelled as a sample and never dressed up as live.
 */
export function QuoteProvenance({
  quote,
  className = "",
}: {
  quote: Quote;
  className?: string;
}) {
  const p = provenanceOf(quote);
  if (!p.live) {
    return (
      <p className={`text-text-low text-[11px] ${className}`}>
        <span className="border-line text-text-mid mr-1.5 rounded border px-1.5 py-0.5">
          Sample data
        </span>
        Illustrative values — not live market data
      </p>
    );
  }
  return (
    <p className={`text-text-low text-[11px] ${className}`}>
      Source {p.source}
      {p.asOf ? <> · as of {p.asOf}</> : null}
      {" · "}
      {p.delay ?? "real-time"}
    </p>
  );
}

/**
 * Compact inline marker for dense rows (screener, movers). A live row shows
 * nothing extra — the table's coverage banner already states source & delay,
 * and each price cell carries a full-provenance `title`. A sample row gets a
 * small muted tag so it can never be mistaken for real market data.
 */
export function SampleTag({ quote }: { quote: Quote }) {
  if (quote.provider.toLowerCase() !== "fixture") return null;
  return (
    <span
      className="border-line text-text-low ml-2 rounded border px-1 py-px align-middle text-[10px]"
      title="Illustrative sample — not live market data"
    >
      sample
    </span>
  );
}
