import Link from "next/link";
import type { DisplayCurrency } from "@/lib/currency/peg";
import type { Theme } from "@/lib/theme/theme";
import { CurrencyToggle } from "./CurrencyToggle";
import { ThemeToggle } from "./ThemeToggle";
import { SymbolSearch } from "@/components/market/SymbolSearch";

const NAV = [
  { href: "/markets", label: "Markets" },
  { href: "/news", label: "News" },
  { href: "/economy", label: "Economy" },
  { href: "/methodology", label: "Methodology" },
];

export function Header({
  currency,
  theme,
}: {
  currency: DisplayCurrency;
  theme: Theme;
}) {
  return (
    <header className="border-line bg-canvas/95 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-6 px-4">
        <Link
          href="/"
          className="flex items-baseline gap-1.5"
          aria-label="MarketIntelligence home"
        >
          <span className="font-editorial text-text-hi text-[19px] leading-none">
            Market<span className="ours">Intelligence</span>
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-5 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-text-mid hover:text-text-hi text-[13px] transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <SymbolSearch />
          <CurrencyToggle current={currency} />
          <ThemeToggle initial={theme} />
        </div>
      </div>
    </header>
  );
}
