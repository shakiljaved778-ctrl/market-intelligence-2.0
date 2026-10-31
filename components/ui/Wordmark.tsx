import { BrandMark } from "./BrandMark";

/**
 * Mizaan wordmark: the balance-beam mark + "MIZAAN" in the editorial serif with
 * wide tracking, and "Intelligence" in Inter small-caps (--ink-3). The ◆ in the
 * mark is the only saffron here; the type is monochrome chrome.
 */
export function Wordmark({
  size = 24,
  showTagline = true,
  className,
}: {
  size?: number;
  showTagline?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <BrandMark size={size} className="text-ink" />
      <span className="flex flex-col leading-none">
        <span
          className="text-ink font-serif text-[19px] leading-none font-semibold tracking-[0.14em]"
          style={{ fontVariantCaps: "normal" }}
        >
          MIZAAN
        </span>
        {showTagline ? (
          <span
            className="text-ink-3 mt-[3px] text-[10px] leading-none tracking-[0.22em]"
            style={{ fontVariant: "small-caps" }}
          >
            Intelligence
          </span>
        ) : null}
      </span>
    </span>
  );
}
