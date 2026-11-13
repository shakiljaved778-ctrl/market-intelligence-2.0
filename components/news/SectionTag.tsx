import Link from "next/link";
import { isGccRegion, regionLabel, type Region } from "@/lib/curation/region";
import { sectionMeta } from "@/lib/curation/section";

/**
 * Section tag (§13). A quiet chip naming a story's editorial vertical. The muted
 * section hue appears only as a small dot — chrome stays monochrome (§12).
 */
export function SectionTag({
  section,
  region,
  href,
  className,
}: {
  section: string;
  /** When the story concerns a GCC country (or the GCC), its name is appended. */
  region?: Region;
  href?: string;
  className?: string;
}) {
  const meta = sectionMeta(section);
  const where = region && isGccRegion(region) ? regionLabel(region) : null;
  const inner = (
    <span
      className={`border-line text-text-mid inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] ${className ?? ""}`}
    >
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: meta.hue }}
      />
      {meta.label}
      {where ? <span className="text-text-low">· {where}</span> : null}
    </span>
  );
  if (!href) return inner;
  return (
    <Link href={href} className="hover:text-text-hi transition-colors">
      {inner}
    </Link>
  );
}
