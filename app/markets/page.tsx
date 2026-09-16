import Link from "next/link";
import { Movers } from "@/components/market/Movers";
import { PageHeader } from "@/components/layout/PageHeader";
import { getDisplayCurrency } from "@/lib/currency/server";
import { sessionFor } from "@/lib/format/session";

export const metadata = { title: "Markets" };

const EXCHANGES: { code: string; label: string }[] = [
  { code: "NASDAQ", label: "NASDAQ" },
  { code: "NYSE", label: "NYSE" },
  { code: "LSE", label: "London" },
  { code: "TSE", label: "Tokyo" },
  { code: "QSE", label: "Qatar (EOD)" },
  { code: "CRYPTO", label: "Crypto" },
];

export default async function MarketsPage() {
  const currency = await getDisplayCurrency();
  return (
    <div className="pb-4">
      <div className="header-band bleed">
        <div className="mx-auto max-w-[1280px] px-4 py-8">
          <PageHeader
            live
            kicker="global markets + GCC rail"
            title="Markets"
            subtitle="Session clocks, movers and a server-side screener across the global and GCC rails. Index levels are currency-neutral and never converted."
            action={
              <Link href="/markets/screener" className="btn btn-ghost text-[13px]">
                Open screener <span aria-hidden>→</span>
              </Link>
            }
          />
        </div>
      </div>

      {/* Per-exchange session clocks (§13). Global live; GCC labelled EOD. */}
      <section
        className="fade-up mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
        style={{ "--d": "80ms" } as React.CSSProperties}
      >
        {EXCHANGES.map((ex) => {
          const s = sessionFor(ex.code);
          const open = s.state === "open";
          return (
            <div key={ex.code} className="card card-hover p-3.5">
              <div className="flex items-center justify-between">
                <div className="text-text-mid text-[12px]">{ex.label}</div>
                {open ? <span className="live-dot" aria-hidden /> : null}
              </div>
              <div
                className={`mt-2 text-[13px] ${open ? "dir-gain" : "text-text-low"}`}
              >
                {s.label}
              </div>
            </div>
          );
        })}
      </section>

      <section
        className="fade-up mt-8 max-w-xl"
        style={{ "--d": "160ms" } as React.CSSProperties}
      >
        <Movers currency={currency} />
      </section>
    </div>
  );
}
