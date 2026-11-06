import Link from "next/link";
import { Prose } from "@/components/layout/Prose";
import { pageMeta } from "@/lib/seo";
import { listCorrections } from "@/lib/corrections";
import { EDITOR } from "@/lib/author";
import { formatAstDate } from "@/lib/format/datetime";

export const metadata = pageMeta(
  "/corrections",
  "Corrections",
  "How to report an error at Mizaan, how quickly we respond, and a running log of the corrections we have issued.",
);

interface SearchParams {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CorrectionsPage({ searchParams }: SearchParams) {
  const sp = await searchParams;
  const about = (Array.isArray(sp.url) ? sp.url[0] : sp.url) ?? "";
  const corrections = await listCorrections();
  const subject = encodeURIComponent(
    about ? `Correction: ${about}` : "Correction request",
  );

  return (
    <Prose eyebrow="accuracy" title="Corrections">
      <p>
        We correct material errors openly and quickly. If something on Mizaan is wrong —
        a figure, a headline, a source, a date — please tell us.
      </p>

      {about ? (
        <p>
          <strong>Reporting an error on:</strong>{" "}
          <span className="break-all">{about}</span>
        </p>
      ) : null}

      <h2>How to report</h2>
      <p>
        Email <a href={`mailto:${EDITOR.email}?subject=${subject}`}>{EDITOR.email}</a>{" "}
        with the page, what is wrong and (if you can) a source, or use the{" "}
        <Link href={about ? `/contact?url=${encodeURIComponent(about)}` : "/contact"}>
          contact form
        </Link>
        . We aim to acknowledge reports within <strong>two business days</strong> and to
        correct confirmed errors promptly, noting the change here.
      </p>

      <h2>Correction log</h2>
      {corrections.length === 0 ? (
        <p className="text-text-low">
          No corrections have been issued to date. When we make one, it will be listed
          here with the date, the story and what changed.
        </p>
      ) : (
        <ul>
          {corrections.map((c, i) => (
            <li key={i}>
              <strong>{formatAstDate(c.date)}</strong> —{" "}
              {c.url ? <a href={c.url}>{c.headline}</a> : c.headline}: {c.note}
            </li>
          ))}
        </ul>
      )}
    </Prose>
  );
}
