import { Prose } from "@/components/layout/Prose";
import { NewsletterSignup } from "@/components/news/NewsletterSignup";
import { pageMeta } from "@/lib/seo";
import { NEWSLETTER_NAME } from "@/lib/newsletter";

export const metadata = pageMeta(
  "/newsletter",
  `${NEWSLETTER_NAME} — daily market briefing`,
  `Subscribe to ${NEWSLETTER_NAME}: GCC closes, overnight global moves and the five stories that matter, in one email before the open.`,
);

interface SearchParams {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const MESSAGES: Record<string, { tone: "ok" | "info"; text: string }> = {
  pending: {
    tone: "ok",
    text: "Almost there — check your inbox for a confirmation link to finish subscribing.",
  },
  confirmed: {
    tone: "ok",
    text: "You're subscribed. The next Mizaan Morning briefing is on its way.",
  },
  unsubscribed: {
    tone: "info",
    text: "You've been unsubscribed. You can re-subscribe below any time.",
  },
  invalid: {
    tone: "info",
    text: "That link or email wasn't valid — please try again below.",
  },
  rate_limited: {
    tone: "info",
    text: "Too many attempts — please wait a little and try again.",
  },
  unavailable: {
    tone: "info",
    text: "Signups aren't live yet. Please check back soon.",
  },
  error: {
    tone: "info",
    text: "Something went wrong — please try again, or email us.",
  },
};

export default async function NewsletterPage({ searchParams }: SearchParams) {
  const sp = await searchParams;
  const state = (Array.isArray(sp.state) ? sp.state[0] : sp.state) ?? "";
  const msg = MESSAGES[state];

  return (
    <Prose eyebrow="before the open" title={NEWSLETTER_NAME}>
      <p>
        One email each trading morning: GCC closes, overnight moves in the US, Europe,
        Asia, oil, gold and bitcoin, the five stories that matter and today&rsquo;s
        calendar. Rankings computed; summaries cited.
      </p>
      {msg ? (
        <p className={msg.tone === "ok" ? "text-signal-strong" : "text-text-mid"}>
          {msg.text}
        </p>
      ) : null}
      <div className="not-prose mt-6 max-w-[46ch]">
        <NewsletterSignup source="newsletter-page" />
      </div>
    </Prose>
  );
}
