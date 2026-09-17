import Link from "next/link";
import { sectionMeta } from "@/lib/curation/section";

/**
 * Section tag (§13). A quiet chip naming a story's editorial vertical. The muted
 * section hue appears only as a small dot — chrome stays monochrome (§12).
 */
export function SectionTag({
  section,
  href,
  className,
}: {
  section: string;
  href?: string;
  className?: string;
}) {
  const meta = sectionMeta(section);
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
    </span>
  );
  if (!href) return inner;
  return (
    <Link href={href} className="hover:text-text-hi transition-colors">
      {inner}
    </Link>
  );
}
