"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { CURRENCY_COOKIE, type DisplayCurrency } from "@/lib/currency/peg";

const OPTIONS: DisplayCurrency[] = ["USD", "QAR"];

/**
 * Currency toggle (§7, §12). Persists in a cookie so Server Components read it
 * and render the correct figures without a client-side flash. Keyboard-operable
 * from any page — part of the quality floor.
 */
export function CurrencyToggle({ current }: { current: DisplayCurrency }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function select(next: DisplayCurrency) {
    if (next === current) return;
    // 1 year, site-wide.
    document.cookie = `${CURRENCY_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div
      role="group"
      aria-label="Display currency"
      className="border-line bg-surface inline-flex items-center rounded-[6px] border p-0.5"
    >
      {OPTIONS.map((ccy) => {
        const active = ccy === current;
        return (
          <button
            key={ccy}
            type="button"
            onClick={() => select(ccy)}
            aria-pressed={active}
            disabled={isPending}
            className={`tnum rounded-[4px] px-2.5 py-1 text-[13px] transition-colors ${
              active ? "bg-raised text-text-hi" : "text-text-mid hover:text-text-hi"
            }`}
          >
            {ccy}
          </button>
        );
      })}
    </div>
  );
}
