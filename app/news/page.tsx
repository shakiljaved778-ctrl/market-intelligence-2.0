import Link from "next/link";
import { Wire } from "@/components/news/Wire";
import { allTopics, readWire } from "@/lib/news/read";

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
  const clusters = await readWire({
    topic: topic || undefined,
    ticker: ticker || undefined,
  });

  return (
    <div className="py-8">
      <h1 className="font-editorial text-text-hi text-[27px]">The wire</h1>
      <p className="text-text-mid mt-1 text-[13px]">
        Stories ranked by how many independent outlets cover them — the source count is
        the ranking, made visible.{" "}
        <span className="text-text-low">Computed, not AI-written.</span>
      </p>

      {/* Topic filter (§13). */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/news"
          className={`rounded-[6px] border px-2.5 py-1 text-[12px] ${
            topic ? "border-line text-text-mid" : "border-iris ours"
          }`}
        >
          All
        </Link>
        {allTopics().map((t) => (
          <Link
            key={t}
            href={`/news?topic=${t}`}
            className={`rounded-[6px] border px-2.5 py-1 text-[12px] ${
              topic === t
                ? "border-iris ours"
                : "border-line text-text-mid hover:text-text-hi"
            }`}
          >
            {t.replace(/_/g, " ")}
          </Link>
        ))}
      </div>

      {ticker ? (
        <p className="text-text-mid mt-3 text-[12px]">
          Filtered to <span className="tnum text-text-hi">{ticker.toUpperCase()}</span>{" "}
          ·{" "}
          <Link href="/news" className="ours">
            clear
          </Link>
        </p>
      ) : null}

      <div className="mt-5">
        <Wire clusters={clusters} />
      </div>
    </div>
  );
}
