import { redirect } from "next/navigation";
import { Prose } from "@/components/layout/Prose";
import { pageMeta } from "@/lib/seo";
import { EDITOR } from "@/lib/author";
import { sendContactEmail } from "@/lib/contact";

export const metadata = pageMeta(
  "/contact",
  "Contact",
  "Reach the Mizaan editorial desk — by email or the contact form — for corrections, questions, partnerships and press.",
);

interface SearchParams {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const inputClass =
  "border-hairline bg-surface text-ink focus:border-line-strong mt-1 w-full rounded-[8px] border px-3 py-2 text-[14px] outline-none";

export default async function ContactPage({ searchParams }: SearchParams) {
  const sp = await searchParams;
  const sent = (Array.isArray(sp.sent) ? sp.sent[0] : sp.sent) === "1";
  const errored = Boolean(Array.isArray(sp.error) ? sp.error[0] : sp.error);

  async function submit(formData: FormData) {
    "use server";
    // Honeypot: a filled hidden field means a bot — pretend success.
    if (formData.get("company")) redirect("/contact?sent=1");
    const res = await sendContactEmail({
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      message: String(formData.get("message") ?? ""),
    });
    redirect(res.ok ? "/contact?sent=1" : "/contact?error=1");
  }

  return (
    <Prose eyebrow="get in touch" title="Contact">
      <p>
        For corrections, questions, partnerships or press, email{" "}
        <a href={`mailto:${EDITOR.email}`}>{EDITOR.email}</a> or use the form below.
      </p>

      {sent ? (
        <p className="text-signal-strong">
          Thanks — your message has been sent. We aim to reply within two business days.
        </p>
      ) : null}
      {errored ? (
        <p className="text-text-mid">
          The form isn&rsquo;t accepting messages right now — please email{" "}
          <a href={`mailto:${EDITOR.email}`}>{EDITOR.email}</a> directly.
        </p>
      ) : null}

      <form action={submit} className="not-prose mt-6 flex max-w-[48ch] flex-col gap-4">
        <label className="text-ink-2 text-[13px]">
          Name
          <input name="name" type="text" autoComplete="name" className={inputClass} />
        </label>
        <label className="text-ink-2 text-[13px]">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className={inputClass}
          />
        </label>
        <label className="text-ink-2 text-[13px]">
          Message
          <textarea name="message" required rows={5} className={inputClass} />
        </label>
        {/* Honeypot (hidden from humans). */}
        <input
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          className="hidden"
        />
        <button type="submit" className="btn btn-primary self-start">
          Send message
        </button>
      </form>
    </Prose>
  );
}
