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
        {/* Wordmark: hairline mark + bold name + a quiet "intelligence" lockup. */}
        <Link
          href="/"
          className="flex items-center gap-2.5"
          aria-label="Mizaan Intelligence home"
        >
          <span className="mark" aria-hidden />
          <span className="flex flex-col leading-none">
            <span className="text-text-hi text-[19px] font-bold tracking-[0.16em]">
              MIZAA<span className="ours">N</span>
            </span>
            <span className="text-text-low mt-1 hidden font-mono text-[9px] tracking-[0.34em] sm:block">
              INTELLIGENCE
            </span>
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
              className="pill text-text-mid hover:bg-raised hover:text-text-hi px-3 py-1.5 font-mono text-[12px] font-semibold transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <SymbolSearch />
          <CurrencyToggle current={currency} />
          <ThemeToggle initial={theme} />

          {/* Mobile menu — native <details> disclosure, no client JS. Gives phone
              users the full nav that the desktop pill hides below md. */}
          <details className="group relative md:hidden">
            <summary
              className="pill border-line bg-surface text-text-mid hover:text-text-hi flex h-9 w-9 cursor-pointer list-none items-center justify-center border transition-colors [&::-webkit-details-marker]:hidden"
              aria-label="Open menu"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  className="group-open:hidden"
                  d="M4 7h16M4 12h16M4 17h16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  className="hidden group-open:block"
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </summary>
            <nav
              aria-label="Primary (mobile)"
              className="border-line bg-raised absolute right-0 z-50 mt-2 w-48 rounded-[12px] border p-1.5 shadow-lg"
            >
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-text-mid hover:bg-surface hover:text-text-hi block rounded-[8px] px-3 py-2.5 font-mono text-[13px] font-semibold transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
