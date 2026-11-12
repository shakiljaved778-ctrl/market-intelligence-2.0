import { stampText, type StampInput } from "@/lib/market/provenance";

/**
 * The source-and-time line printed beside a price (trust invariant). Chrome-
 * neutral by design (§12): provenance is metadata, so it uses muted text only —
 * never the gain/loss data colours or the accent. Renders nothing when there is
 * no real value to stamp (the surface then shows its empty state instead).
 */
export function PriceStamp({
  stamp,
  className = "",
  withYear = false,
}: {
  stamp: StampInput;
  className?: string;
  withYear?: boolean;
}) {
  const text = stampText(stamp, withYear);
  if (!text) return null;
  return <span className={`text-ink-3 text-[11px] ${className}`}>{text}</span>;
}

/** A short, honest empty state for a price surface with no real data stored. */
export function NoData({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`border-hairline text-ink-3 rounded-[8px] border px-4 py-8 text-center text-[13px] ${className}`}
    >
      {children}
    </div>
  );
}
