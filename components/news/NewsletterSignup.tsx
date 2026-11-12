import { subscribeAction } from "@/app/actions/newsletter";
import { NEWSLETTER_NAME } from "@/lib/newsletter";

/**
 * Newsletter signup (Phase 6). Reuses existing tokens/components — no new styles.
 * Allowed placements only: the end of an article ("article") and one footer row
 * ("footer"). No pop-ups, no modals, no sticky bars. ONE visible email field and
 * one button (plus a hidden honeypot); posts to the subscribeAction server
 * action, which sends the double-opt-in confirmation email.
 */
// `bg-bg` (the page canvas) + a strong border keep the field visible on the
// footer's `bg-surface` — it used to blend into its own background.
const inputClass =
  "border-line-strong bg-bg text-ink placeholder:text-ink-3 focus:border-brand min-h-[44px] rounded-[8px] border px-3 py-2 text-[14px] outline-none";

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
          {NEWSLETTER_NAME} — the morning briefing, by email:
        </label>
        <div className="flex gap-2">
          <input
            id="nl-footer-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@email.com"
            className={`${inputClass} w-full sm:w-[220px]`}
          />
          <button
            type="submit"
            className="btn btn-primary min-h-[44px] shrink-0 text-[13px]"
          >
            Subscribe
          </button>
        </div>
        {/* Consent is given by submitting and then confirming by email (double
            opt-in), so the form is one field and one button. */}
        <p className="text-ink-3 text-[11px]">
          We&rsquo;ll email a confirmation link. Unsubscribe anytime.
        </p>
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
        The five ranked stories that matter and source-stamped market figures — one
        email each trading morning.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          aria-label="Email address"
          placeholder="you@email.com"
          className={`${inputClass} w-full`}
        />
        <button type="submit" className="btn btn-primary min-h-[44px] shrink-0">
          Subscribe
        </button>
      </div>
      <p className="text-ink-3 mt-3 text-[12px]">
        We&rsquo;ll email a confirmation link before sending anything. Unsubscribe
        anytime.
      </p>
      {Hidden}
    </form>
  );
}
