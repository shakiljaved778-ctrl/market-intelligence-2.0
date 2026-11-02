import Link from "next/link";
import type { GccCompany } from "@/content/gcc-companies";
import { exchangeMeta } from "@/lib/market/gcc";
import type { DisplayCurrency } from "@/lib/currency/peg";
import type { Quote } from "@/lib/providers/types";
import type { WireCluster } from "@/lib/news/read";
import { QuoteProvenance } from "@/components/market/Provenance";
import { formatMoney } from "@/lib/format/currency";
import { directionGlyph, directionOf, formatPercent } from "@/lib/format/percent";

/**
 * GCC company page (Phase 5), rendered inside the existing /quote layout. Shows
 * the price block ONLY when a real quote exists — never an invented price. With
 * no GCC data provider configured the page is profile + peers + a clear
 * "pricing pending" state, and the route marks itself noindex (see the page).
 */
export function GccCompanyView({
  company,
  quote,
  currency,
  peers,
  related,
}: {
  company: GccCompany;
  quote: Quote | null;
  currency: DisplayCurrency;
  peers: GccCompany[];
  related: WireCluster[];
}) {
  const ex = exchangeMeta(company.exchange);
  const dir = quote ? directionOf(quote.change) : "flat";
  const dirClass =
    dir === "gain" ? "dir-gain" : dir === "loss" ? "dir-loss" : "text-text-mid";

  return (
    <div className="pb-4">
      <div className="header-band bleed">
        <div className="mx-auto max-w-[1280px] px-4 py-8">
          {/* Breadcrumbs: Home > Markets > [Exchange] > [Name]. */}
          <nav className="text-ink-3 mb-3 text-[12px]" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-brand">
              Home
            </Link>{" "}
            /{" "}
            <Link href="/markets" className="hover:text-brand">
              Markets
            </Link>{" "}
            /{" "}
            <Link href={`/markets/${company.exchange}`} className="hover:text-brand">
              {ex?.shortName ?? company.exchange.toUpperCase()}
            </Link>{" "}
            / <span className="text-ink-2">{company.nameEn}</span>
          </nav>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-ink-2 flex items-center gap-2 text-[13px]">
                <span className="tnum">{company.symbol}</span>
                <span className="text-ink-4">·</span>
                <span>{ex?.name ?? company.exchange.toUpperCase()}</span>
                <span className="text-ink-4">·</span>
                <span>{company.sector}</span>
              </div>
              <h1 className="t-h1 font-editorial text-ink mt-1">
                {company.nameEn} share price
              </h1>
            </div>

            {quote ? (
              <div className="text-right">
                <div className="tnum text-ink text-[clamp(2rem,5vw,3rem)] leading-none">
                  {formatMoney(quote.priceUsd, currency)}
                </div>
                <div className={`tnum mt-1 text-[14px] ${dirClass}`}>
                  <span aria-hidden>{directionGlyph(quote.change)}</span>{" "}
                  {formatPercent(quote.changePct)}
                </div>
              </div>
            ) : null}
          </div>

          {quote ? (
            <div className="mt-2">
              <QuoteProvenance quote={quote} />
            </div>
          ) : null}
        </div>
      </div>

      {!quote ? (
        <section className="border-hairline mt-6 rounded-[10px] border p-4">
          <p className="text-text-mid text-[13px]">
            End-of-day pricing for {ex?.name ?? "this exchange"} is pending — we show a
            price here only once a verified end-of-day source is connected. Company
            reference and coverage are shown below.
          </p>
        </section>
      ) : null}

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <section className="lg:col-span-8">
          <h2 className="t-h3 font-editorial text-ink mb-2">About {company.nameEn}</h2>
          {company.profile ? (
            <p className="text-ink-2 text-[15px] leading-relaxed">{company.profile}</p>
          ) : (
            <p className="text-text-low text-[13px]">
              A company profile for {company.nameEn} ({company.sector}, {ex?.shortName})
              will appear here once added. [CHECK: owner to supply a factual
              description.]
            </p>
          )}

          {related.length > 0 ? (
            <>
              <h2 className="t-h3 font-editorial text-ink mt-8 mb-2">
                Related coverage
              </h2>
              <ul className="flex flex-col gap-2">
                {related.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/news/${c.slug}`}
                      className="text-ink-2 hover:text-brand text-[14px]"
                    >
                      {c.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>

        <aside className="lg:col-span-4">
          <div className="flex flex-col gap-7 lg:sticky lg:top-4">
            <div>
              <h2 className="t-micro text-ink-3 mb-3">
                Sector peers · {company.sector}
              </h2>
              {peers.length === 0 ? (
                <p className="text-text-low text-[13px]">No peers listed yet.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {peers.map((p) => (
                    <li key={p.symbol}>
                      <Link
                        href={`/quote/${p.symbol}`}
                        className="text-ink-2 hover:text-brand text-[14px]"
                      >
                        {p.nameEn}{" "}
                        <span className="tnum text-ink-4 text-[12px]">{p.symbol}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="border-brand border-l-2 pl-4">
              <p className="text-text-low text-[12px] leading-relaxed">
                {ex?.name} coverage. Index levels and prices are shown only when a
                verified end-of-day source is connected — never illustrative values.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
