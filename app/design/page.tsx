import type { Metadata } from "next";
import { SignalScore } from "@/components/ui/SignalScore";
import { InstrumentChip } from "@/components/ui/InstrumentChip";
import { BrandMark } from "@/components/ui/BrandMark";
import { Wordmark } from "@/components/ui/Wordmark";
import {
  CardSkeleton,
  EmptyState,
  ErrorState,
  Skeleton,
  StaleStamp,
} from "@/components/ui/States";

// Internal design-system reference — never indexed.
export const metadata: Metadata = {
  title: "Design System",
  robots: { index: false, follow: false },
};

const TOKENS: { group: string; names: string[] }[] = [
  { group: "Surfaces", names: ["bg", "surface", "surface-2", "brand-soft"] },
  { group: "Hairlines", names: ["hairline", "hairline-strong"] },
  { group: "Ink", names: ["ink", "ink-2", "ink-3", "ink-4"] },
  { group: "Accents", names: ["brand", "signal", "signal-strong"] },
  { group: "Data", names: ["up", "up-soft", "down", "down-soft", "flat"] },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-hairline border-t py-8">
      <h2 className="t-micro text-ink-3 mb-5">{title}</h2>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  return (
    <div className="py-8">
      <div className="mb-2 flex items-center gap-3">
        <BrandMark size={28} className="text-ink" />
        <h1 className="t-h1 text-ink">Design system</h1>
      </div>
      <p className="text-ink-2 t-body max-w-[60ch]">
        The Mizaan component and token reference. Use the theme control in the header to
        preview Ledger (light) and Terminal Night (dark); toggle CB for the
        colorblind-safe data palette.
      </p>

      <Section title="Wordmark">
        <div className="flex flex-wrap items-center gap-10">
          <Wordmark />
          <Wordmark showTagline={false} size={20} />
          <BrandMark size={40} className="text-ink" />
        </div>
      </Section>

      <Section title="Colour tokens">
        <div className="flex flex-col gap-6">
          {TOKENS.map((t) => (
            <div key={t.group}>
              <p className="text-ink-3 mb-2 text-[13px]">{t.group}</p>
              <div className="flex flex-wrap gap-3">
                {t.names.map((n) => (
                  <div key={n} className="w-[128px]">
                    <div
                      className="border-hairline h-14 rounded-[6px] border"
                      style={{ background: `var(--${n})` }}
                    />
                    <p className="text-ink-2 mt-1.5 font-mono text-[11px]">--{n}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Type scale">
        <div className="flex flex-col gap-3">
          <p className="t-display text-ink">Display · Newsreader 56→40</p>
          <p className="t-h1 text-ink">Heading 1 · 40→30</p>
          <p className="t-h2 text-ink">Heading 2 · 28→22</p>
          <p className="t-h3 text-ink">Heading 3 · 20→18</p>
          <p className="t-body text-ink-2 max-w-[68ch]">
            Body · Inter 17/1.6 for articles. The quick brown fox jumps over the lazy
            dog while prices tick: $1,749.42, −6.55%, 14:32 AST.
          </p>
          <p className="text-ink-2 t-small">Small · 13px UI text.</p>
          <p className="t-micro text-ink-3">Micro label · 11px uppercase</p>
          <p className="tnum text-ink text-[15px]">
            Figures (JetBrains Mono, tabular slashed-zero): 0123456789 · 1,234,567.89
          </p>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn btn-primary" type="button">
            Primary action <span aria-hidden>→</span>
          </button>
          <button className="btn btn-ghost" type="button">
            Ghost action
          </button>
        </div>
      </Section>

      <Section title="Signal score (the signature)">
        <div className="flex flex-wrap items-center gap-8">
          <SignalScore score={94} asLink />
          <SignalScore score={68} asLink />
          <SignalScore score={41} asLink />
          <SignalScore score={18} asLink />
          <SignalScore score={41} showValue={false} />
        </div>
      </Section>

      <Section title="Instrument chips">
        <div className="flex flex-wrap items-center gap-2">
          <InstrumentChip symbol="NVDA" changePct={1.24} />
          <InstrumentChip symbol="AAPL" changePct={-0.52} />
          <InstrumentChip symbol="MSFT" changePct={0} />
          <InstrumentChip symbol="BTC" />
        </div>
      </Section>

      <Section title="States">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-ink-3 mb-2 text-[13px]">Skeleton</p>
            <CardSkeleton />
          </div>
          <div>
            <p className="text-ink-3 mb-2 text-[13px]">Empty</p>
            <EmptyState title="The wire is quiet" hint="New stories appear here." />
          </div>
          <div>
            <p className="text-ink-3 mb-2 text-[13px]">Error</p>
            <ErrorState />
          </div>
          <div>
            <p className="text-ink-3 mb-2 text-[13px]">Stale / line skeleton</p>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-2/3" />
            <div className="mt-3">
              <StaleStamp updated="14:32 AST" source="Finnhub" />
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}
