import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Prose } from "@/components/layout/Prose";
import { NewsletterSignup } from "@/components/news/NewsletterSignup";
import { buildBriefing } from "@/lib/briefing";
import { canonical, graph, newsArticleLd } from "@/lib/seo";
import { directionGlyph, directionOf, formatPercent } from "@/lib/format/percent";
import { formatAstDate } from "@/lib/format/datetime";

interface Params {
  params: Promise<{ date: string }>;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { date } = await params;
  if (!DATE_RE.test(date)) return {};
  const b = await buildBriefing(date);
  return {
    title: b.title,
    description: `Mizaan Morning for ${date}: index closes and the ${b.topStories.length} stories that mattered.`,
    alternates: { canonical: canonical(`/briefing/${date}`) },
  };
}

export default async function BriefingPage({ params }: Params) {
  const { date } = await params;
  if (!DATE_RE.test(date)) notFound();
  const b = await buildBriefing(date);
  const iso = `${date}T06:00:00.000Z`;
  const jsonLd = graph(
    newsArticleLd({
      headline: b.title,
      description: `Index closes and the ${b.topStories.length} stories that mattered.`,
      slug: `briefing/${date}`, // used only for the article URL in the LD
      datePublished: iso,
      section: "Markets",
    }),
  );

  return (
    <Prose eyebrow="daily briefing" title={b.title} updated={formatAstDate(iso)}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <h2>Index closes</h2>
      {b.indices.length === 0 ? (
        <p className="text-text-low">No validated index closes for this session.</p>
      ) : (
        <ul>
          {b.indices.map((i) => {
            const dir = directionOf(i.changePct);
            return (
              <li key={i.name}>
                {i.name}{" "}
                <span
                  className={`tnum ${dir === "gain" ? "dir-gain" : dir === "loss" ? "dir-loss" : ""}`}
                >
                  <span aria-hidden>{directionGlyph(i.changePct)}</span>{" "}
                  {formatPercent(i.changePct)}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <h2>Stories that mattered</h2>
      <ol>
        {b.topStories.map((s) => (
          <li key={s.slug}>
            <Link href={`/news/${s.slug}`}>{s.title}</Link>{" "}
            <span className="text-text-low">· {s.sourceCount} sources</span>
          </li>
        ))}
      </ol>

      <p className="text-text-low text-[12px]">
        Index levels are currency-neutral and never converted. Rankings computed;
        summaries AI-written from cited sources. Informational only, not investment
        advice.
      </p>

      <div className="not-prose mt-6 max-w-[46ch]">
        <NewsletterSignup source={`briefing:${date}`} />
      </div>
    </Prose>
  );
}
