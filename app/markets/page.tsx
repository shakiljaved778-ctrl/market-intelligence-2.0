import Link from "next/link";
import { Movers } from "@/components/market/Movers";
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
    <div className="py-8">
      <div className="flex items-center justify-between">
        <h1 className="font-editorial text-text-hi text-[27px]">Markets</h1>
        <Link
          href="/markets/screener"
          className="text-iris text-[13px] hover:underline"
        >
          Open screener
        </Link>
      </div>

      {/* Per-exchange session clocks (§13). Global live; GCC labelled EOD. */}
      <div className="mt-5 grid grid-cols-2 gap-px sm:grid-cols-3 lg:grid-cols-6">
        {EXCHANGES.map((ex) => {
          const s = sessionFor(ex.code);
          return (
            <div key={ex.code} className="border-line border p-3">
              <div className="text-text-mid text-[12px]">{ex.label}</div>
              <div
                className={`mt-1 text-[13px] ${
                  s.state === "open" ? "dir-gain" : "text-text-low"
                }`}
              >
                {s.label}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 max-w-xl">
        <Movers currency={currency} />
      </div>
    </div>
  );
}
