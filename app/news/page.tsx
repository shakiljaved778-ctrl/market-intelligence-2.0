import Link from "next/link";
import { Wire } from "@/components/news/Wire";
import { PageHeader } from "@/components/layout/PageHeader";
import { allSections, allTopics, readWire } from "@/lib/news/read";

export const metadata = { title: "The wire" };

interface SearchParams {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export default async function NewsPage({ searchParams }: SearchParams) {
  const sp = await searchParams;
  const topic = one(sp.topic);
  const ticker = one(sp.ticker);
  const section = one(sp.section);
  const clusters = await readWire({
    topic: topic || undefined,
    ticker: ticker || undefined,
    section: section || undefined,
  });
  const sections = allSections();

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-[12px] transition-colors ${
      active
        ? "border-iris/50 bg-iris/10 ours"
        : "border-line text-text-mid hover:border-line-strong hover:text-text-hi"
    }`;

  const keep = (extra: Record<string, string>) => {
    const params = new URLSearchParams();
    if (section) params.set("section", section);
    if (topic) params.set("topic", topic);
    for (const [k, v] of Object.entries(extra)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    const q = params.toString();
    return q ? `/news?${q}` : "/news";
  };

  return (
    <div className="pb-4">
      <div className="header-band bleed">
        <div className="mx-auto max-w-[1280px] px-4 py-8">
          <PageHeader
            live
            kicker="the wire · ranked by source count"
            title="The wire"
            subtitle={
              <>
                Stories ranked by how many independent outlets cover them — the source
                count is the ranking, made visible.{" "}
                <span className="text-text-low">Computed, not AI-written.</span>
              </>
            }
          />

          {/* Section switcher (§13) — markets-first, with the non-financial mix. */}
          <div
            className="fade-up mt-5 flex flex-wrap gap-2"
            style={{ "--d": "60ms" } as React.CSSProperties}
          >
            <Link
              href={topic ? `/news?topic=${topic}` : "/news"}
              className={chip(!section)}
            >
              All
            </Link>
            {sections.map((s) => (
              <Link
                key={s.id}
                href={`/news?section=${s.id}`}
                className={chip(section === s.id)}
                title={s.blurb}
              >
                <span className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ background: s.hue }}
                  />
                  {s.label}
                </span>
              </Link>
            ))}
          </div>

          {/* Topic filter (§13) — finer-grained, within any section. */}
          <div
            className="fade-up mt-3 flex flex-wrap gap-2"
            style={{ "--d": "100ms" } as React.CSSProperties}
          >
            <Link href={keep({ topic: "" })} className={chip(!topic)}>
              All topics
            </Link>
            {allTopics().map((t) => (
              <Link key={t} href={keep({ topic: t })} className={chip(topic === t)}>
                {t.replace(/_/g, " ")}
              </Link>
            ))}
          </div>

          {ticker ? (
            <p className="text-text-mid mt-3 text-[12px]">
              Filtered to{" "}
              <span className="tnum text-text-hi">{ticker.toUpperCase()}</span> ·{" "}
              <Link href="/news" className="ours">
                clear
              </Link>
            </p>
          ) : null}
        </div>
      </div>

      <div className="fade-up mt-6" style={{ "--d": "140ms" } as React.CSSProperties}>
        <Wire clusters={clusters} />
      </div>
    </div>
  );
}
