import Link from "next/link";
import type { DisplayCurrency } from "@/lib/currency/peg";
import type { Theme } from "@/lib/theme/theme";
import { CurrencyToggle } from "./CurrencyToggle";
import { ThemeToggle } from "./ThemeToggle";
import { SymbolSearch } from "@/components/market/SymbolSearch";

const NAV = [
  { href: "/markets", label: "Markets" },
  { href: "/news", label: "Wire" },
  { href: "/sections", label: "Sections" },
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
      <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-4 px-4">
        {/* Wordmark: hairline mark + bold uppercase name. */}
        <Link href="/" className="flex items-center gap-2.5" aria-label="Mizan home">
          <span className="mark" aria-hidden />
          <span className="text-text-hi text-[19px] leading-none font-bold tracking-[0.18em]">
            MIZA<span className="ours">N</span>
          </span>
        </Link>

        {/* Pill nav with mono labels — chrome, not data. */}
        <nav
          aria-label="Primary"
          className="pill border-line bg-surface ml-2 hidden items-center border p-1 md:flex"
        >
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="pill text-text-mid hover:bg-raised hover:text-text-hi px-3 py-1.5 font-mono text-[12px] transition-colors"
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
