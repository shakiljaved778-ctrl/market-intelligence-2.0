import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { readCluster } from "@/lib/news/read";
import { relativeTime } from "@/lib/format/relative-time";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const detail = await readCluster(slug);
  return { title: detail?.cluster.title ?? "Story" };
}

export default async function ClusterPage({ params }: Params) {
  const { slug } = await params;
  const detail = await readCluster(slug);
  if (!detail) notFound();
  const { cluster, members } = detail;

  return (
    <div className="py-8">
      <div className="flex items-center gap-3 text-[12px]">
        <span className="ours tnum" title="Importance score">
          ◆ {cluster.importanceScore}
        </span>
        <span className="ours tnum">
          {cluster.sourceCount} {cluster.sourceCount === 1 ? "source" : "sources"}
        </span>
        <span className="text-text-low">{relativeTime(cluster.eventTime)}</span>
      </div>

      <h1 className="font-editorial text-text-hi mt-2 max-w-[68ch] text-[27px] leading-tight">
        {cluster.title}
      </h1>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {cluster.tickers.map((t) => (
          <Link
            key={t}
            href={`/quote/${t}`}
            className="tnum border-line text-text-mid hover:text-iris rounded-[4px] border px-1.5 py-0.5 text-[12px]"
          >
            {t}
          </Link>
        ))}
        {cluster.topics.map((t) => (
          <Link key={t} href={`/news?topic=${t}`} className="text-text-low text-[12px]">
            #{t.replace(/_/g, " ")}
          </Link>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Development timeline / source list (§13). Each outlet linked out. */}
        <section className="lg:col-span-8">
          <h2 className="text-text-mid mb-2 text-[13px] font-medium">
            Coverage · {members.length} {members.length === 1 ? "report" : "reports"}
          </h2>
          <ol className="border-line border-t">
            {members.map((m, i) => (
              <li key={`${m.url}-${i}`} className="border-line border-b py-3">
                <div className="flex items-center gap-2 text-[12px]">
                  <span className="text-text-mid">{m.sourceName}</span>
                  <span className="text-text-low">· {relativeTime(m.publishedAt)}</span>
                </div>
                <h3 className="font-editorial text-text-hi mt-1 max-w-[68ch] text-[17px] leading-snug">
                  {m.headline}
                </h3>
                {m.dek ? (
                  <p className="text-text-mid mt-1 max-w-[68ch] text-[13px]">{m.dek}</p>
                ) : null}
                <a
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-low hover:text-iris mt-1 inline-block text-[12px]"
                >
                  Read at source
                </a>
              </li>
            ))}
          </ol>
          <p className="text-text-low mt-3 text-[11px]">
            Headlines and short deks only, each linked to its source. We never republish
            article text.
          </p>
        </section>

        <aside className="lg:col-span-4">
          <div className="border-iris border-l-2 pl-4">
            <div className="ours flex items-center gap-2 text-[12px]">
              <span aria-hidden>◆</span>
              <span>Why this ranks</span>
            </div>
            <p className="text-text-low mt-2 text-[13px] leading-relaxed">
              Ranked {cluster.importanceScore}/100 from {cluster.sourceCount}{" "}
              independent
              {cluster.sourceCount === 1 ? " source" : " sources"}, source tier,
              associated market moves and recency. See{" "}
              <Link href="/methodology" className="ours">
                methodology
              </Link>
              .
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
