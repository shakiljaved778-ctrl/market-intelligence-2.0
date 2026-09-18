import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { readCluster, readWire } from "@/lib/news/read";
import { readQuote } from "@/lib/market/read";
import { getDisplayCurrency } from "@/lib/currency/server";
import { sectionMeta } from "@/lib/curation/section";
import { relativeTime } from "@/lib/format/relative-time";
import { formatMoney } from "@/lib/format/currency";
import { directionGlyph, directionOf, formatPercent } from "@/lib/format/percent";
import type { Quote } from "@/lib/providers/types";
import { ArticleBody } from "@/components/news/ArticleBody";
import { CoverArt } from "@/components/news/CoverArt";
import { SectionTag } from "@/components/news/SectionTag";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const detail = await readCluster(slug);
  return { title: detail?.cluster.title ?? "Story" };
}

export default async function ClusterPage({ params }: Params) {
  const { slug } = await params;
  const detail = await readCluster(slug);
  if (!detail) notFound();
  const { cluster, members, body } = detail;

  // Right-rail context (real data only): the instruments this story concerns with
  // their latest cached move, and more stories in the same section.
  const [currency, sectionWire] = await Promise.all([
    getDisplayCurrency(),
    readWire({ section: cluster.section }),
  ]);
  const instruments: { symbol: string; quote: Quote }[] = (
    await Promise.all(
      cluster.tickers.map(async (symbol) => {
        const quote = await readQuote(symbol);
        return quote ? { symbol, quote } : null;
      }),
    )
  ).filter((x): x is { symbol: string; quote: Quote } => x !== null);
  const more = sectionWire.filter((c) => c.slug !== cluster.slug).slice(0, 4);

  return (
    <div className="py-8">
      {/* Cover hero. */}
      <figure className="mb-6">
        <div className="border-line bg-surface aspect-[16/6] w-full overflow-hidden rounded-[14px] border">
          <CoverArt
            section={cluster.section}
            seed={cluster.slug}
            imageUrl={cluster.imageUrl}
            className="h-full w-full"
          />
        </div>
        {cluster.imageCredit ? (
          <figcaption className="text-text-low mt-1.5 text-[11px]">
            Photo:{" "}
            <a
              href={cluster.imageCredit.creditUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-text-mid"
            >
              {cluster.imageCredit.credit}
            </a>{" "}
            / Pexels
          </figcaption>
        ) : null}
      </figure>

      <div className="flex items-center gap-3 text-[12px]">
        <SectionTag
          section={cluster.section}
          href={`/news?section=${cluster.section}`}
        />
        <span className="ours tnum" title="Importance score">
          ◆ {cluster.importanceScore}
        </span>
        <span className="ours tnum">
          {cluster.sourceCount} {cluster.sourceCount === 1 ? "source" : "sources"}
        </span>
        <span className="text-text-low">{relativeTime(cluster.eventTime)}</span>
      </div>

      <h1 className="font-editorial text-text-hi mt-2 max-w-[68ch] text-[27px] leading-tight">
        {cluster.title}
      </h1>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {cluster.tickers.map((t) => (
          <Link
            key={t}
            href={`/quote/${t}`}
            className="tnum border-line text-text-mid hover:text-iris rounded-[4px] border px-1.5 py-0.5 text-[12px]"
          >
            {t}
          </Link>
        ))}
        {cluster.topics.map((t) => (
          <Link key={t} href={`/news?topic=${t}`} className="text-text-low text-[12px]">
            #{t.replace(/_/g, " ")}
          </Link>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <section className="lg:col-span-8">
          {/* AI-written original brief — our content, synthesised from the facts. */}
          {body ? (
            <article className="border-line mb-8 border-b pb-8">
              <div className="ours border-iris/25 bg-iris/10 mb-3 inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px]">
                <span aria-hidden>◆</span>
                AI-written summary · from {cluster.sourceCount}{" "}
                {cluster.sourceCount === 1 ? "source" : "sources"}
              </div>
              <ArticleBody md={body.md} />
              <p className="text-text-low mt-5 text-[11px] leading-relaxed">
                Written by AI from the linked reports below — original text, not copied
                from any source. Informational only, not investment advice; verify
                against the originals.
              </p>
            </article>
          ) : null}

          <h2 className="text-text-mid mb-2 text-[13px] font-medium">
            Sources · {members.length} {members.length === 1 ? "report" : "reports"}
          </h2>
          <ol className="border-line border-t">
            {members.map((m, i) => (
              <li key={`${m.url}-${i}`} className="border-line border-b py-3">
                <div className="flex items-center gap-2 text-[12px]">
                  <span className="text-text-mid">{m.sourceName}</span>
                  <span className="text-text-low">· {relativeTime(m.publishedAt)}</span>
                </div>
                <h3 className="font-editorial text-text-hi mt-1 max-w-[68ch] text-[17px] leading-snug">
                  {m.headline}
                </h3>
                {m.dek ? (
                  <p className="text-text-mid mt-1 max-w-[68ch] text-[13px]">{m.dek}</p>
                ) : null}
                <a
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-low hover:text-iris mt-1 inline-block text-[12px]"
                >
                  Read at source
                </a>
              </li>
            ))}
          </ol>
          <p className="text-text-low mt-3 text-[11px]">
            Headlines and short deks only, each linked to its source. We never republish
            article text.
          </p>
        </section>

        <aside className="lg:col-span-4">
          <div className="flex flex-col gap-7 lg:sticky lg:top-4">
            <div className="border-iris border-l-2 pl-4">
              <div className="ours flex items-center gap-2 text-[12px]">
                <span aria-hidden>◆</span>
                <span>Why this ranks</span>
              </div>
              <p className="text-text-low mt-2 text-[13px] leading-relaxed">
                Ranked {cluster.importanceScore}/100 from {cluster.sourceCount}{" "}
                independent
                {cluster.sourceCount === 1 ? " source" : " sources"}, source tier,
                associated market moves and recency. See{" "}
                <Link href="/methodology" className="ours">
                  methodology
                </Link>
                .
              </p>
            </div>

            {instruments.length > 0 ? (
              <div>
                <h2 className="text-text-mid mb-2.5 text-[11px] font-medium tracking-[0.12em] uppercase">
                  Instruments in this story
                </h2>
                <ul className="border-line divide-line divide-y border-t border-b">
                  {instruments.map(({ symbol, quote }) => {
                    const dir = directionOf(quote.change);
                    const dirClass =
                      dir === "gain"
                        ? "dir-gain"
                        : dir === "loss"
                          ? "dir-loss"
                          : "text-text-mid";
                    const barPct = Math.min(
                      100,
                      Math.round((Math.abs(quote.changePct) / 5) * 100),
                    );
                    const barBg =
                      dir === "gain"
                        ? "var(--gain)"
                        : dir === "loss"
                          ? "var(--loss)"
                          : "var(--line)";
                    return (
                      <li key={symbol} className="py-2.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <Link
                            href={`/quote/${symbol}`}
                            className="tnum text-text-hi hover:text-iris text-[13px] font-medium"
                          >
                            {symbol}
                          </Link>
                          <span className="tnum text-text-mid text-[13px]">
                            {formatMoney(quote.priceUsd, currency)}
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="bg-raised h-1 flex-1 overflow-hidden rounded-full">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${barPct}%`, background: barBg }}
                            />
                          </div>
                          <span
                            className={`tnum flex items-center gap-0.5 text-[11px] ${dirClass}`}
                          >
                            <span aria-hidden>{directionGlyph(quote.change)}</span>
                            {formatPercent(quote.changePct)}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <p className="text-text-low mt-2 text-[11px]">
                  Latest cached price; move vs prior close. Bar scaled to ±5%.
                </p>
              </div>
            ) : null}

            {more.length > 0 ? (
              <div>
                <h2 className="text-text-mid mb-2.5 text-[11px] font-medium tracking-[0.12em] uppercase">
                  More in {sectionMeta(cluster.section).label}
                </h2>
                <ul className="border-line divide-line divide-y border-t border-b">
                  {more.map((c) => (
                    <li key={c.slug} className="py-2.5">
                      <Link href={`/news/${c.slug}`} className="group block">
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="ours tnum">◆ {c.importanceScore}</span>
                          <span className="text-text-low">
                            {c.sourceCount} {c.sourceCount === 1 ? "source" : "sources"}
                          </span>
                        </div>
                        <h3 className="font-editorial text-text-hi group-hover:text-iris mt-0.5 text-[14px] leading-snug">
                          {c.title}
                        </h3>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
