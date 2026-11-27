import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleBody } from "@/components/news/ArticleBody";
import { KeyTakeaways } from "@/components/news/KeyTakeaways";
import { CoverArt } from "@/components/news/CoverArt";
import { readOriginal } from "@/lib/news/originals";
import { relativeTime } from "@/lib/format/relative-time";
import { canonical } from "@/lib/seo";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const o = await readOriginal(slug);
  if (!o) return { title: "Not found", robots: { index: false } };
  return {
    title: `${o.title} | Mizaan Original`,
    description: o.dek,
    alternates: { canonical: canonical(`/analysis/${o.slug}`) },
  };
}

const AST = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Qatar",
});

/**
 * A Mizaan Original (owner request, 2026-11-20): a broad, AI-written overview
 * synthesised from the cited reports listed below — labelled as such, with
 * every source linked (§10, §17).
 */
export default async function OriginalPage({ params }: Params) {
  const { slug } = await params;
  const o = await readOriginal(slug);
  if (!o) notFound();

  return (
    <div className="py-8">
      <figure className="mb-6">
        <div className="border-line bg-surface aspect-[16/6] w-full overflow-hidden rounded-[14px] border">
          <CoverArt
            section="markets"
            seed={o.slug}
            imageUrl={o.coverUrl}
            feature={{ place: "Global markets" }}
            className="h-full w-full"
          />
        </div>
        {o.coverCredit && o.coverCreditUrl ? (
          <figcaption className="text-text-low mt-1.5 text-[11px]">
            Photo:{" "}
            <a
              href={o.coverCreditUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-text-mid"
            >
              {o.coverCredit}
            </a>{" "}
            / Pexels
          </figcaption>
        ) : null}
      </figure>

      <span className="ours border-iris/25 bg-iris/10 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12px]">
        <span aria-hidden>◆</span> Mizaan Original · Global markets
      </span>
      <h1 className="t-h1 font-editorial text-ink mt-3 max-w-[24ch]">{o.title}</h1>
      <p className="text-ink-2 mt-3 max-w-[68ch] text-[18px] leading-relaxed">
        {o.dek}
      </p>
      <p className="text-ink-3 border-hairline mt-4 border-y py-3 text-[12px]">
        AI-written overview from {o.sources.length} cited reports ·{" "}
        <time dateTime={o.publishedAt}>{AST.format(new Date(o.publishedAt))} AST</time>{" "}
        · {relativeTime(o.publishedAt)}
      </p>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <article className="lg:col-span-8">
          <KeyTakeaways md={o.bodyMd} />
          <ArticleBody md={o.bodyMd} />
          <p className="text-ink-3 mt-6 text-[11px] leading-relaxed">
            Written by AI from the cited reports listed here — original text, not copied
            from any source, with every figure checked against those reports.
            Informational only, not investment advice; verify against the originals.
          </p>
        </article>
        <aside className="lg:col-span-4">
          <h2 className="t-micro text-ink-3 mb-3">
            Sources · {o.sources.length} reports
          </h2>
          <ol className="border-hairline border-t">
            {o.sources.map((s, i) => (
              <li key={`${s.url}-${i}`} className="border-hairline border-b py-3">
                <div className="text-ink-2 text-[12px] font-medium">{s.source}</div>
                {s.slug ? (
                  <Link
                    href={`/news/${s.slug}`}
                    className="font-editorial text-ink hover:text-brand mt-0.5 block text-[15px] leading-snug"
                  >
                    {s.title}
                  </Link>
                ) : (
                  <span className="font-editorial text-ink mt-0.5 block text-[15px] leading-snug">
                    {s.title}
                  </span>
                )}
                {s.url ? (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink-3 hover:text-brand mt-1 inline-block text-[12px]"
                  >
                    Read at source <span aria-hidden>↗</span>
                  </a>
                ) : null}
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}
