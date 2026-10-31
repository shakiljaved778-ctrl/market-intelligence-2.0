import Link from "next/link";
import type { DisplayCurrency } from "@/lib/currency/peg";
import type { ThemePref } from "@/lib/theme/theme";
import { CurrencyToggle } from "./CurrencyToggle";
import { ThemeToggle } from "./ThemeToggle";
import { ColorblindToggle } from "./ColorblindToggle";
import { CommandPalette } from "./CommandPalette";
import { Wordmark } from "@/components/ui/Wordmark";

const NAV = [
  { href: "/markets", label: "Markets" },
  { href: "/news", label: "Wire" },
  { href: "/sections", label: "Sections" },
  { href: "/economy", label: "Economy" },
  { href: "/methodology", label: "Methodology" },
];

export function Header({
  currency,
  themePref,
  colorblind,
}: {
  currency: DisplayCurrency;
  themePref: ThemePref;
  colorblind: boolean;
}) {
  return (
    <header className="border-line bg-canvas/95 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-4 px-4">
        {/* Wordmark: balance-beam mark (◆ pivot) + serif name + small-caps tag. */}
        <Link href="/" aria-label="Mizaan Intelligence home" className="shrink-0">
          <Wordmark />
        </Link>

        {/* Pill nav with mono labels — chrome, not data (desktop). */}
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
          <CommandPalette />
          <CurrencyToggle current={currency} />
          <ColorblindToggle on={colorblind} />
          <ThemeToggle pref={themePref} />
        </div>
      </div>

      {/* Mobile nav — the same pill labels laid out on their own row so every
          section stays reachable on phones (the desktop pill nav is hidden
          below md). Wraps rather than hiding behind a menu, so all links are
          visible at a glance. */}
      <nav
        aria-label="Primary (mobile)"
        className="border-line flex flex-wrap items-center gap-1.5 border-t px-4 py-2 md:hidden"
      >
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="pill border-line text-text-mid hover:bg-raised hover:text-text-hi border px-3 py-1 font-mono text-[12px] font-semibold transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
