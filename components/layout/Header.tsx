import Link from "next/link";
import type { DisplayCurrency } from "@/lib/currency/peg";
import type { Theme } from "@/lib/theme/theme";
import { CurrencyToggle } from "./CurrencyToggle";
import { ThemeToggle } from "./ThemeToggle";
import { SymbolSearch } from "@/components/market/SymbolSearch";

const NAV = [
  { href: "/markets", label: "Markets" },
  { href: "/news", label: "Wire" },
  { href: "/sections", label: "Sections", chevron: true },
  { href: "/economy", label: "Economy" },
  { href: "/methodology", label: "Methodology" },
];

// Editorial verticals surfaced in the mobile menu (ids + tint match §13).
const MENU_SECTIONS = [
  { id: "technology", label: "Tech & AI", hue: "#00b4d8" },
  { id: "health", label: "Health", hue: "#4a90d9" },
  { id: "sports", label: "Sports", hue: "#e8863a" },
  { id: "entertainment", label: "Culture", hue: "#b45cd6" },
  { id: "science", label: "Science", hue: "#d6a92b" },
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
      <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-3 px-4">
        {/* Mobile hamburger (LEFT) — opens a full-screen menu. Native <details>
            disclosure, no client JS. Hidden from md up where the pill nav shows. */}
        <details className="group md:hidden">
          <summary
            className="border-line bg-surface text-text-hi flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-[10px] border [&::-webkit-details-marker]:hidden"
            aria-label="Open menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                className="group-open:hidden"
                d="M3.5 7h17M3.5 12h17M3.5 17h17"
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

          {/* Full-screen slide-in menu, below the header bar. Explicit height (not
              bottom-0) because the header's backdrop-filter makes it the containing
              block for this fixed panel — bottom-0 would collapse it. */}
          <div className="bg-canvas fixed inset-x-0 top-16 z-50 h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain">
            <div className="px-4 pt-4 pb-2">
              <SymbolSearch className="relative w-full" />
            </div>

            <nav aria-label="Primary (mobile)">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="border-line text-text-hi hover:bg-surface flex items-center justify-between border-b px-5 py-4 text-[19px] font-semibold transition-colors"
                >
                  {item.label}
                  {item.chevron ? (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden
                      className="text-text-low"
                    >
                      <path
                        d="M9 6l6 6-6 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : null}
                </Link>
              ))}

              <p className="text-text-low px-5 pt-6 pb-2 font-mono text-[11px] tracking-[0.14em] uppercase">
                Explore
              </p>
              {MENU_SECTIONS.map((s) => (
                <Link
                  key={s.id}
                  href={`/news?section=${s.id}`}
                  className="border-line text-text-hi hover:bg-surface flex items-center gap-3 border-b px-5 py-4 text-[17px] font-medium transition-colors"
                >
                  <span
                    aria-hidden
                    className="inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{ background: s.hue }}
                  />
                  {s.label}
                </Link>
              ))}

              <div className="text-text-mid flex items-center gap-2 px-5 py-6 text-[13px]">
                <span>Currency</span>
                <CurrencyToggle current={currency} />
              </div>
            </nav>
          </div>
        </details>

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

        {/* Pill nav with mono labels — chrome, not data (desktop only). */}
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
          <div className="hidden md:block">
            <SymbolSearch />
          </div>
          <CurrencyToggle current={currency} />
          <ThemeToggle initial={theme} />
        </div>
      </div>
    </header>
  );
}
