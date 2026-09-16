import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDisplayCurrency } from "@/lib/currency/server";
import { listRecaps, readRecap } from "@/lib/narrative/read";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const r = readRecap(slug);
  return { title: r ? `${r.title} — recap` : "Recap" };
}

export default async function RecapPage({ params }: Params) {
  const { slug } = await params;
  const currency = await getDisplayCurrency();
  const recap = readRecap(slug, currency);
  if (!recap) notFound();
  const others = listRecaps(currency).filter((r) => r.slug !== slug);

  return (
    <div className="py-8">
      <div className="border-iris border-l-2 pl-5">
        <div className="ours flex items-center gap-2 text-[12px]">
          <span aria-hidden>◆</span>
          <span>Computed from market data · not AI-written</span>
        </div>
        <h1 className="font-editorial text-text-hi mt-2 text-[27px]">{recap.title}</h1>
        <p className="font-editorial text-text-hi mt-4 max-w-[68ch] text-[19px] leading-[1.6]">
          {recap.output.bodyMd}
        </p>
        <p className="text-text-low mt-3 text-[11px]">
          Template {recap.output.templateVersion} · reproducible from stored inputs ·{" "}
          <Link href="/methodology" className="ours">
            methodology
          </Link>
        </p>
      </div>

      <h2 className="text-text-mid mt-10 mb-2 text-[13px] font-medium">More recaps</h2>
      <ul className="border-line border-t">
        {others.map((r) => (
          <li key={r.slug} className="border-line border-b">
            <Link
              href={`/recap/${r.slug}`}
              className="hover:bg-surface flex items-center justify-between px-1 py-3 transition-colors"
            >
              <span className="font-editorial text-text-hi text-[15px]">{r.title}</span>
              <span className="eyebrow">{r.kind.replace(/_/g, " ")}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
