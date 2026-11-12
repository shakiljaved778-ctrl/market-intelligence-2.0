import Link from "next/link";
import { Prose } from "@/components/layout/Prose";
import { NewsletterSignup } from "@/components/news/NewsletterSignup";
import { pageMeta } from "@/lib/seo";
import { NEWSLETTER_NAME } from "@/lib/newsletter";
import { buildBriefing, recentBriefingDates } from "@/lib/briefing";
import { formatAstDate } from "@/lib/format/datetime";

export const metadata = pageMeta(
  "/briefing",
  `${NEWSLETTER_NAME} archive`,
  `The ${NEWSLETTER_NAME} archive — the ranked stories that mattered each trading morning.`,
);

export default async function BriefingIndexPage() {
  // List only dates that actually have a briefing (stories in their window).
  const candidates = recentBriefingDates(new Date(), 10);
  const built = await Promise.all(candidates.map((d) => buildBriefing(d)));
  const dates = built.filter((b) => b.topStories.length > 0).map((b) => b.date);
  return (
    <Prose eyebrow="daily archive" title={`${NEWSLETTER_NAME} archive`}>
      <p>
        Each trading morning&rsquo;s briefing: the ranked stories published in the 24
        hours before 07:00 Doha time.
      </p>
      {dates.length === 0 ? <p>No briefings are available yet.</p> : null}
      <ul>
        {dates.map((d) => (
          <li key={d}>
            <Link href={`/briefing/${d}`}>{formatAstDate(`${d}T06:00:00.000Z`)}</Link>
          </li>
        ))}
      </ul>
      <div className="not-prose mt-6 max-w-[46ch]">
        <NewsletterSignup source="briefing-archive" />
      </div>
    </Prose>
  );
}
