import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { GCC_EXCHANGES, type GccExchangeId } from "@/content/gcc-companies";
import { exchangeMeta, gccByExchange } from "@/lib/market/gcc";
import { canonical } from "@/lib/seo";

/**
 * Exchange hub (Phase 5): /markets/qse, /markets/tadawul, /markets/adx,
 * /markets/dfm — the listed companies on one GCC exchange, each linking to its
 * company page. Prices appear per company only when a verified EOD source is
 * connected; until then this is a reference roster.
 */
interface Params {
  params: Promise<{ exchange: string }>;
}

export function generateStaticParams(): { exchange: GccExchangeId }[] {
  return GCC_EXCHANGES.map((e) => ({ exchange: e.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { exchange } = await params;
  const ex = exchangeMeta(exchange);
  if (!ex) return {};
  return {
    title: `${ex.name} (${ex.shortName}) — listed companies`,
    description: `Companies listed on the ${ex.name} (${ex.shortName}, ${ex.country}) covered by Mizaan, with share-price pages and the latest news.`,
    alternates: { canonical: canonical(`/markets/${ex.id}`) },
  };
}

export default async function ExchangeHubPage({ params }: Params) {
  const { exchange } = await params;
  const ex = exchangeMeta(exchange);
  if (!ex) notFound();
  const companies = gccByExchange(ex.id);

  return (
    <div className="pb-4">
      <div className="header-band bleed">
        <div className="mx-auto max-w-[1280px] px-4 py-8">
          <PageHeader
            kicker={`${ex.country} · ${ex.shortName}`}
            title={ex.name}
            subtitle={`Listed companies on the ${ex.name}. Share prices appear once a verified end-of-day source is connected — never illustrative values.`}
            action={
              <Link href="/markets" className="btn btn-ghost text-[13px]">
                All markets <span aria-hidden>→</span>
              </Link>
            }
          />
        </div>
      </div>

      <section className="fade-up mt-6">
        {companies.length === 0 ? (
          <p className="text-text-low text-[14px]">
            The {ex.shortName} roster is being prepared. [CHECK: owner to supply the
            company list.]
          </p>
        ) : (
          <div className="border-hairline overflow-hidden rounded-[10px] border">
            <table className="w-full text-[14px]">
              <thead>
                <tr className="border-hairline text-ink-3 border-b text-left text-[12px]">
                  <th className="px-4 py-2 font-medium">Company</th>
                  <th className="px-4 py-2 font-medium">Symbol</th>
                  <th className="px-4 py-2 font-medium">Sector</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr
                    key={c.symbol}
                    className="border-hairline hover:bg-surface border-b last:border-0"
                  >
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/quote/${c.symbol}`}
                        className="text-ink hover:text-brand"
                      >
                        {c.nameEn}
                      </Link>
                    </td>
                    <td className="tnum text-ink-2 px-4 py-2.5">{c.symbol}</td>
                    <td className="text-ink-2 px-4 py-2.5">{c.sector}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
