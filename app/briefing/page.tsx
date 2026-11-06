import Link from "next/link";
import { Prose } from "@/components/layout/Prose";
import { NewsletterSignup } from "@/components/news/NewsletterSignup";
import { pageMeta } from "@/lib/seo";
import { NEWSLETTER_NAME } from "@/lib/newsletter";
import { recentBriefingDates } from "@/lib/briefing";
import { formatAstDate } from "@/lib/format/datetime";

export const metadata = pageMeta(
  "/briefing",
  `${NEWSLETTER_NAME} archive`,
  `The ${NEWSLETTER_NAME} archive — each day's GCC closes, overnight global moves and the stories that mattered.`,
);

export default function BriefingIndexPage() {
  const dates = recentBriefingDates(new Date(), 10);
  return (
    <Prose eyebrow="daily archive" title={`${NEWSLETTER_NAME} archive`}>
      <p>
        Every trading morning&rsquo;s briefing, archived. GCC closes, overnight global
        moves and the five stories that mattered.
      </p>
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
