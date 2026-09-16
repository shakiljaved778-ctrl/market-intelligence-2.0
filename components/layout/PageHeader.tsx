import type { ReactNode } from "react";

/**
 * Consistent, elevated inner-page header (§12, §13). A mono kicker opened by an
 * iris tick, a large editorial title, and an optional subtitle — with an
 * optional action slot on the right. Carries the homepage's finish into every
 * inner page without breaking the monochrome-chrome / iris-is-ours identity.
 */
export function PageHeader({
  kicker,
  title,
  subtitle,
  action,
  live = false,
}: {
  kicker: string;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  /** Show a live pulse instead of the static iris tick. */
  live?: boolean;
}) {
  return (
    <header className="fade-up">
      <div className="flex items-center gap-2">
        {live ? (
          <span className="live-dot" aria-hidden />
        ) : (
          <span className="rule-tick" aria-hidden />
        )}
        <p className="kicker-caps">{kicker}</p>
      </div>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <h1 className="page-title">{title}</h1>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {subtitle ? (
        <p className="text-text-mid mt-2 max-w-[70ch] text-[13px] leading-relaxed">
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}
