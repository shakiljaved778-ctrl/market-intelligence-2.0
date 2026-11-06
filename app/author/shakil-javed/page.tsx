import Link from "next/link";
import { Prose } from "@/components/layout/Prose";
import { EDITOR } from "@/lib/author";
import { canonical, graph, personLd } from "@/lib/seo";
import { readWire } from "@/lib/news/read";

export const metadata = {
  title: `${EDITOR.name} — ${EDITOR.role}`,
  description: `${EDITOR.name}, ${EDITOR.role} at Mizaan Intelligence. Latest stories and how to get in touch.`,
  alternates: { canonical: canonical("/author/shakil-javed") },
};

export default async function AuthorPage() {
  const latest = (await readWire()).slice(0, 8);
  const jsonLd = graph(personLd(EDITOR));

  return (
    <Prose eyebrow="editor" title={EDITOR.name}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <p className="text-text-low -mt-4 text-[13px]">{EDITOR.role}</p>
      <p>{EDITOR.bio}</p>
      <p>
        Contact: <a href={`mailto:${EDITOR.email}`}>{EDITOR.email}</a>
        {EDITOR.linkedin ? (
          <>
            {" · "}
            <a href={EDITOR.linkedin} rel="noopener noreferrer">
              LinkedIn
            </a>
          </>
        ) : (
          <> · LinkedIn [CHECK: add profile URL]</>
        )}
      </p>

      <h2>Latest stories</h2>
      {latest.length === 0 ? (
        <p className="text-text-low">No stories yet.</p>
      ) : (
        <ul>
          {latest.map((c) => (
            <li key={c.slug}>
              <Link href={`/news/${c.slug}`}>{c.title}</Link>
            </li>
          ))}
        </ul>
      )}
    </Prose>
  );
}
