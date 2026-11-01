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
import { ReadingProgress } from "@/components/news/ReadingProgress";
import { ShareButtons } from "@/components/ui/ShareButtons";
import { SignalScore } from "@/components/ui/SignalScore";
import { Sparkline, sparkSeries } from "@/components/ui/Sparkline";
import { breadcrumbLd, canonical, graph, newsArticleLd, ogImage } from "@/lib/seo";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const detail = await readCluster(slug);
  if (!detail) return { title: "Story" };
  const { cluster } = detail;
  const description = (cluster.dek ?? cluster.title).slice(0, 150);
  const section = sectionMeta(cluster.section).label;
  const image = ogImage(cluster.title, section);
  const url = canonical(`/news/${slug}`);
  return {
    title: cluster.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: cluster.title,
      description,
      url,
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title: cluster.title, images: [image] },
  };
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

  // NewsArticle + BreadcrumbList structured data (§6 SEO) — from our own fields.
  const jsonLd = graph(
    newsArticleLd({
      headline: cluster.title,
      description: cluster.dek,
      slug: cluster.slug,
      datePublished: cluster.eventTime,
      dateModified: cluster.eventTime,
      section: sectionMeta(cluster.section).label,
      sources: members.map((m) => m.url),
      imageUrl: cluster.imageUrl,
    }),
    breadcrumbLd([
      { name: "Home", path: "/" },
      { name: "Wire", path: "/news" },
      {
        name: sectionMeta(cluster.section).label,
        path: `/news/section/${cluster.section}`,
      },
      { name: cluster.title, path: `/news/${cluster.slug}` },
    ]),
  );

  return (
    <div className="py-8">
      <ReadingProgress />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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

      {/* Kicker. */}
      <Link
        href={`/news?section=${cluster.section}`}
        className="t-micro text-ink-3 hover:text-brand"
      >
        {sectionMeta(cluster.section).label}
      </Link>

      <h1 className="t-h1 font-editorial text-ink mt-1 max-w-[20ch]">
        {cluster.title}
      </h1>

      {cluster.dek ? (
        <p className="text-ink-2 mt-3 max-w-[68ch] text-[18px] leading-relaxed">
          {cluster.dek}
        </p>
      ) : null}

      <div className="border-hairline mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-y py-3 text-[12px]">
        <SignalScore score={cluster.importanceScore} asLink />
        <span className="text-signal-strong tnum">
          {cluster.sourceCount} {cluster.sourceCount === 1 ? "source" : "sources"}
        </span>
        <span className="text-ink-3">{relativeTime(cluster.eventTime)}</span>
        <div className="ml-auto">
          <ShareButtons title={cluster.title} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {cluster.tickers.map((t) => (
          <Link
            key={t}
            href={`/quote/${t}`}
            className="tnum border-hairline text-ink-2 hover:text-brand rounded-[4px] border px-1.5 py-0.5 text-[12px]"
          >
            {t}
          </Link>
        ))}
        {cluster.topics.map((t) => (
          <Link key={t} href={`/news?topic=${t}`} className="text-ink-3 text-[12px]">
            #{t.replace(/_/g, " ")}
          </Link>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <section className="lg:col-span-8">
          {/* AI-written original brief — our content, synthesised from the facts. */}
          {body ? (
            <article className="bg-surface-2 border-hairline mb-8 rounded-[8px] border p-5">
              <div className="text-signal-strong mb-3 inline-flex items-center gap-2 text-[11px] font-medium">
                <span aria-hidden>◆</span>
                AI-written · from {cluster.sourceCount}{" "}
                {cluster.sourceCount === 1 ? "cited source" : "cited sources"}
              </div>
              <ArticleBody md={body.md} />
              <p className="text-ink-3 mt-5 text-[11px] leading-relaxed">
                Written by AI from the cited reports below — original text, not copied
                from any source. Informational only, not investment advice; verify
                against the originals.
              </p>
            </article>
          ) : null}

          <h2 className="t-micro text-ink-3 mb-3">
            Sources · {members.length} {members.length === 1 ? "report" : "reports"}
          </h2>
          <ol className="border-hairline border-t">
            {members.map((m, i) => (
              <li
                key={`${m.url}-${i}`}
                className="border-hairline flex gap-3 border-b py-3"
              >
                <span className="tnum text-signal-strong mt-0.5 shrink-0 text-[12px]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[12px]">
                    <span className="text-ink-2 font-medium">{m.sourceName}</span>
                    <span className="text-ink-3">· {relativeTime(m.publishedAt)}</span>
                  </div>
                  <h3 className="font-editorial text-ink mt-1 max-w-[68ch] text-[17px] leading-snug">
                    {m.headline}
                  </h3>
                  {m.dek ? (
                    <p className="text-ink-2 mt-1 max-w-[68ch] text-[13px]">{m.dek}</p>
                  ) : null}
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink-3 hover:text-brand mt-1 inline-block text-[12px]"
                  >
                    Read at source <span aria-hidden>↗</span>
                  </a>
                </div>
              </li>
            ))}
          </ol>
          <p className="text-ink-3 mt-3 text-[11px]">
            Headlines and short deks only, each linked to its source. We never republish
            article text.
          </p>
        </section>

        <aside className="lg:col-span-4">
          <div className="flex flex-col gap-7 lg:sticky lg:top-4">
            <div className="border-brand border-l-2 pl-4">
              <div className="text-signal-strong flex items-center gap-2 text-[12px]">
                <span aria-hidden>◆</span>
                <span>Why this ranks</span>
              </div>
              <p className="text-ink-3 mt-2 text-[13px] leading-relaxed">
                Ranked {cluster.importanceScore}/100 from {cluster.sourceCount}{" "}
                independent
                {cluster.sourceCount === 1 ? " source" : " sources"}, source tier,
                associated market moves and recency. See{" "}
                <Link href="/methodology" className="text-brand">
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
                <ul className="border-hairline divide-hairline divide-y border-t border-b">
                  {instruments.map(({ symbol, quote }) => {
                    const dir = directionOf(quote.change);
                    const sd = dir === "gain" ? "up" : dir === "loss" ? "down" : "flat";
                    const dirClass =
                      dir === "gain"
                        ? "text-up"
                        : dir === "loss"
                          ? "text-down"
                          : "text-ink-3";
                    return (
                      <li key={symbol} className="flex items-center gap-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <Link
                              href={`/quote/${symbol}`}
                              className="tnum text-ink hover:text-brand text-[13px] font-medium"
                            >
                              {symbol}
                            </Link>
                            <span className="tnum text-ink-2 text-[13px]">
                              {formatMoney(quote.priceUsd, currency)}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center justify-between gap-2">
                            <Sparkline
                              values={sparkSeries(symbol, quote.changePct)}
                              dir={sd}
                              width={72}
                              height={18}
                            />
                            <span
                              className={`tnum flex items-center gap-0.5 text-[11px] ${dirClass}`}
                            >
                              <span aria-hidden>{directionGlyph(quote.change)}</span>
                              {formatPercent(quote.changePct)}
                            </span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <p className="text-ink-3 mt-2 text-[11px]">
                  Latest cached price; move vs prior close. Trend is illustrative.
                </p>
              </div>
            ) : null}

            {more.length > 0 ? (
              <div>
                <h2 className="t-micro text-ink-3 mb-2.5">
                  More in {sectionMeta(cluster.section).label}
                </h2>
                <ul className="border-hairline divide-hairline divide-y border-t border-b">
                  {more.map((c) => (
                    <li key={c.slug} className="py-2.5">
                      <Link href={`/news/${c.slug}`} className="group block">
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="text-signal-strong tnum">
                            ◆ {c.importanceScore}
                          </span>
                          <span className="text-ink-3">
                            {c.sourceCount} {c.sourceCount === 1 ? "source" : "sources"}
                          </span>
                        </div>
                        <h3 className="font-editorial text-ink mt-0.5 text-[14px] leading-snug underline-offset-2 group-hover:underline">
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
