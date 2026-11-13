import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Prose } from "@/components/layout/Prose";
import { NewsletterSignup } from "@/components/news/NewsletterSignup";
import { buildBriefing } from "@/lib/briefing";
import { canonical, graph, newsArticleLd } from "@/lib/seo";
import { ChangePill } from "@/components/market/ChangePill";
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
    description: `Mizaan Morning for ${date}: the ${b.topStories.length} stories that mattered.`,
    alternates: { canonical: canonical(`/briefing/${date}`) },
    // A date with no stories in its window has no briefing to index.
    robots: b.topStories.length === 0 ? { index: false, follow: true } : undefined,
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
      description: `The ${b.topStories.length} stories that mattered.`,
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

      {b.markets.length > 0 ? (
        <>
          <h2>Markets</h2>
          <ul>
            {b.markets.map((m) => (
              <li key={m.name}>
                {m.name} <span className="tnum">{m.value}</span>{" "}
                <ChangePill pct={m.changePct} />
                <br />
                <span className="text-text-low text-[12px]">{m.stamp}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <h2>Stories that mattered</h2>
      {b.topStories.length === 0 ? (
        <p className="text-text-low">
          No briefing was published for this date: no ranked stories fall in its window.
        </p>
      ) : (
        <ol>
          {b.topStories.map((s) => (
            <li key={s.slug}>
              <Link href={`/news/${s.slug}`}>{s.title}</Link>{" "}
              <span className="text-text-low">
                · {s.sourceCount} {s.sourceCount === 1 ? "source" : "sources"}
              </span>
            </li>
          ))}
        </ol>
      )}
      <p className="text-text-low text-[12px]">
        Stories are those published in the 24 hours before 07:00 Doha time on this date,
        in ranked order. Rankings are computed; summaries are AI-written from cited
        sources. Informational only, not investment advice.
      </p>

      <div className="not-prose mt-6 max-w-[46ch]">
        <NewsletterSignup source={`briefing:${date}`} />
      </div>
    </Prose>
  );
}
