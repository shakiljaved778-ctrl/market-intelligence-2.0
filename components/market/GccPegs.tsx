import { GCC_PEGS } from "@/content/gcc-pegs";

/**
 * GCC currency pegs reference card (behind NEXT_PUBLIC_FLAG_GCC_PEGS). Official
 * policy rates, labelled as such — not market quotes, so no change pill.
 */
export function GccPegs() {
  return (
    <section aria-labelledby="gcc-pegs-heading" className="mt-10">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 id="gcc-pegs-heading" className="t-h3 font-editorial text-ink">
          GCC currency pegs
        </h2>
        <p className="text-ink-3 text-[12px]">
          Official policy rates set by each central bank — not market quotes.
        </p>
      </div>
      <div className="border-hairline overflow-x-auto rounded-[10px] border">
        <table className="w-full min-w-[560px] text-[14px]">
          <thead>
            <tr className="border-hairline text-ink-3 border-b text-left text-[12px]">
              <th className="px-4 py-2 font-medium">Currency</th>
              <th className="px-4 py-2 font-medium">Per US dollar</th>
              <th className="px-4 py-2 font-medium">Regime</th>
              <th className="px-4 py-2 font-medium">Set by</th>
            </tr>
          </thead>
          <tbody>
            {GCC_PEGS.map((p) => (
              <tr key={p.code} className="border-hairline border-b last:border-0">
                <td className="px-4 py-2.5">
                  <span className="text-ink font-semibold">{p.code}</span>{" "}
                  <span className="text-ink-3">{p.currency}</span>
                </td>
                <td className="tnum text-ink px-4 py-2.5">
                  {p.perUsd === null ? (
                    <span className="text-ink-3">Basket</span>
                  ) : (
                    p.perUsd.toLocaleString("en-US", { maximumFractionDigits: 4 })
                  )}
                </td>
                <td className="text-ink-2 px-4 py-2.5">{p.regime}</td>
                <td className="text-ink-2 px-4 py-2.5">
                  {p.authority} · since {p.since}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
