"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab =
  | {
      kind: "link";
      label: string;
      href: string;
      glyph: string;
      match: (p: string) => boolean;
    }
  | { kind: "action"; label: string; glyph: string; onClick: () => void };

const TABS: Tab[] = [
  { kind: "link", label: "Home", href: "/", glyph: "◇", match: (p) => p === "/" },
  {
    kind: "link",
    label: "Markets",
    href: "/markets",
    glyph: "▦",
    match: (p) =>
      p.startsWith("/markets") || p.startsWith("/quote") || p.startsWith("/economy"),
  },
  {
    kind: "link",
    label: "Wire",
    href: "/news",
    glyph: "≡",
    match: (p) => p.startsWith("/news") || p.startsWith("/sections"),
  },
  {
    kind: "action",
    label: "Search",
    glyph: "⌕",
    onClick: () => window.dispatchEvent(new CustomEvent("mi:open-command")),
  },
];

/**
 * Mobile bottom tab bar (primary navigation on phones). Hidden from md up.
 * 44px touch targets; "Search" opens the command palette, which reaches every
 * section and page. The body reserves bottom padding so content isn't hidden.
 */
export function MobileTabBar() {
  const pathname = usePathname() || "/";
  return (
    <nav
      aria-label="Primary (mobile)"
      className="border-hairline bg-surface/95 fixed inset-x-0 bottom-0 z-40 flex border-t backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {TABS.map((t) => {
        const active = t.kind === "link" && t.match(pathname);
        const inner = (
          <>
            <span aria-hidden className="text-[18px] leading-none">
              {t.glyph}
            </span>
            <span className="text-[10px] font-medium">{t.label}</span>
          </>
        );
        const cls = `flex min-h-[48px] flex-1 flex-col items-center justify-center gap-1 py-1.5 ${
          active ? "text-brand" : "text-ink-3"
        }`;
        if (t.kind === "action") {
          return (
            <button key={t.label} type="button" onClick={t.onClick} className={cls}>
              {inner}
            </button>
          );
        }
        return (
          <Link
            key={t.label}
            href={t.href}
            className={cls}
            aria-current={active ? "page" : undefined}
          >
            {inner}
          </Link>
        );
      })}
    </nav>
  );
}
