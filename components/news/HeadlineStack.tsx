import Link from "next/link";
import type { WireCluster } from "@/lib/news/read";
import { relativeTime } from "@/lib/format/relative-time";
import { SectionTag } from "./SectionTag";

/**
 * Top headlines (owner request, 2026-11-27): the lead story in a large, bold
 * sans headline with its dek, then the next 4–5 top stories stacked beneath it
 * as bold headlines separated by hairlines. Text-only and fast — the photo-led
 * cards follow further down the page. Headlines are the sources' own titles;
 * the order is the computed ranking.
 */
export function HeadlineStack({ stories }: { stories: WireCluster[] }) {
  const [lead, ...rest] = stories;
  if (!lead) return null;
  return (
    <section aria-labelledby="headline-stack-heading" className="mb-10">
      <h2 id="headline-stack-heading" className="sr-only">
        Top headlines
      </h2>
      <Link href={`/news/${lead.slug}`} className="group block">
        <div className="mb-2 flex items-center gap-3 text-[12px]">
          <SectionTag section={lead.section} region={lead.region} />
          <span className="text-ink-3">{relativeTime(lead.eventTime)}</span>
        </div>
        <p className="text-ink font-sans text-3xl leading-tight font-extrabold tracking-tight underline-offset-4 group-hover:underline sm:text-4xl">
          {lead.title}
        </p>
        {lead.dek ? (
          <p className="text-ink-2 mt-3 max-w-[68ch] text-[16px] leading-relaxed">
            {lead.dek}
          </p>
        ) : null}
      </Link>
      {rest.length > 0 ? (
        <ul className="mt-5">
          {rest.map((c, i) => (
            <li
              key={c.slug}
              className={
                i === 0
                  ? "border-hairline mb-2 rounded-[12px] border px-4"
                  : "border-hairline border-t"
              }
            >
              <Link href={`/news/${c.slug}`} className="group block py-3.5">
                <span className="text-ink font-sans text-[19px] leading-snug font-bold tracking-tight underline-offset-4 group-hover:underline">
                  {c.title}
                </span>
                <span className="text-ink-3 mt-1 block text-[12px]">
                  {relativeTime(c.eventTime)} · {c.sourceCount}{" "}
                  {c.sourceCount === 1 ? "source" : "sources"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
