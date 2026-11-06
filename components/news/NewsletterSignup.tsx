import { subscribeAction } from "@/app/actions/newsletter";
import { NEWSLETTER_NAME } from "@/lib/newsletter";

/**
 * Newsletter signup (Phase 6). Reuses existing tokens/components — no new styles.
 * Allowed placements only: the end of an article ("article") and one footer row
 * ("footer"). No pop-ups, no modals, no sticky bars. Email + one consent box +
 * a honeypot; posts to the subscribeAction server action (double opt-in).
 */
const inputClass =
  "border-hairline bg-surface text-ink focus:border-line-strong rounded-[8px] border px-3 py-2 text-[14px] outline-none";

export function NewsletterSignup({
  source,
  variant = "article",
}: {
  source: string;
  variant?: "article" | "footer";
}) {
  const Hidden = (
    <>
      <input type="hidden" name="source" value={source} />
      <input
        name="company"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="hidden"
      />
    </>
  );

  if (variant === "footer") {
    return (
      <form
        action={subscribeAction}
        className="flex flex-col gap-2 sm:flex-row sm:items-center"
      >
        <label htmlFor="nl-footer-email" className="text-ink-2 text-[13px] sm:mr-1">
          {NEWSLETTER_NAME} — the daily GCC &amp; global briefing:
        </label>
        <div className="flex gap-2">
          <input
            id="nl-footer-email"
            name="email"
            type="email"
            required
            placeholder="you@email.com"
            className={`${inputClass} w-full sm:w-[220px]`}
          />
          <button type="submit" className="btn btn-primary shrink-0 text-[13px]">
            Subscribe
          </button>
        </div>
        <label className="text-ink-4 flex items-center gap-1.5 text-[11px]">
          <input
            type="checkbox"
            name="consent"
            required
            className="accent-[var(--brand)]"
          />
          Send me the daily briefing
        </label>
        {Hidden}
      </form>
    );
  }

  return (
    <form
      action={subscribeAction}
      className="border-hairline bg-surface rounded-[12px] border p-5"
    >
      <h3 className="t-h3 font-editorial text-ink">
        Start your day with {NEWSLETTER_NAME}
      </h3>
      <p className="text-ink-2 mt-1 text-[14px]">
        GCC closes, overnight global moves and the five stories that matter — one email,
        before the open.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          name="email"
          type="email"
          required
          placeholder="you@email.com"
          className={`${inputClass} w-full`}
        />
        <button type="submit" className="btn btn-primary shrink-0">
          Subscribe
        </button>
      </div>
      <label className="text-ink-3 mt-3 flex items-center gap-2 text-[12px]">
        <input
          type="checkbox"
          name="consent"
          required
          className="accent-[var(--brand)]"
        />
        Send me the daily {NEWSLETTER_NAME} briefing. Unsubscribe anytime.
      </label>
      {Hidden}
    </form>
  );
}
