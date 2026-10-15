import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata = {
  title: "Pricing",
  description:
    "Mizan is free to read. Pro unlocks real-time data, the full screener and alerts; Business licenses the signal API and the GCC + Shariah module.",
};

/**
 * Pricing (monetization scaffold). Three tiers built around what already ships:
 * the free computed layer is the funnel, Pro gates the real-time/advanced
 * surfaces, Business licenses the signal + the GCC/Shariah module (where the
 * real revenue is). Information-only framing throughout (§10) — nothing here is
 * advice or a trade signal. Checkout is not wired yet: CTAs collect intent.
 */

const CONTACT = "mailto:hello@mizan.com";

type Tier = {
  name: string;
  tagline: string;
  price: string;
  unit?: string;
  note: string;
  features: string[];
  cta: { label: string; href: string };
  featured?: boolean;
};

const TIERS: Tier[] = [
  {
    name: "Free",
    tagline: "The signal, open to everyone",
    price: "$0",
    note: "No account needed to read.",
    features: [
      "Source-ranked wire, 10-min refresh",
      "Delayed quotes + global index strip",
      "Computed session recaps",
      "Basic screener (global + GCC)",
      "USD · QAR, everywhere",
    ],
    cta: { label: "Open Mizan", href: "/news" },
  },
  {
    name: "Pro",
    tagline: "For active investors",
    price: "$16",
    unit: "/mo",
    note: "Billed monthly · annual saves two months.",
    features: [
      "Everything in Free",
      "Real-time quotes + full price history*",
      "Full screener — Shariah filter + saved screens",
      "Alerts: price moves + “your tickers hit the wire”",
      "Instrument recaps + watchlists",
      "CSV export",
    ],
    cta: {
      label: "Join the waitlist",
      href: `${CONTACT}?subject=Mizan%20Pro%20waitlist`,
    },
    featured: true,
  },
  {
    name: "Business",
    tagline: "For banks, brokers & fintechs",
    price: "Custom",
    note: "Annual licence · onboarding included.",
    features: [
      "Signal API — the source-ranked feed",
      "GCC + Shariah intelligence module",
      "White-label embeds + widgets",
      "Priority data + uptime SLA",
      "Dedicated support",
    ],
    cta: { label: "Contact sales", href: `${CONTACT}?subject=Mizan%20for%20business` },
  },
];

function Check() {
  return (
    <svg
      className="ours mt-0.5 shrink-0"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M5 12.5l4 4 10-11"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function PricingPage() {
  return (
    <div className="pb-4">
      <div className="header-band bleed">
        <div className="mx-auto max-w-[1280px] px-4 py-8">
          <PageHeader
            kicker="free to read · pro unlocks depth"
            title="Pricing"
            subtitle="Mizan is free to read — the ranked wire, recaps and dual-currency figures. Pro unlocks real-time data and the full toolkit; Business licenses the signal itself."
          />
        </div>
      </div>

      <section className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
        {TIERS.map((tier, i) => (
          <div
            key={tier.name}
            className={`card card-hover fade-up relative flex flex-col p-6 ${
              tier.featured ? "border-iris/45" : ""
            }`}
            style={{ "--d": `${i * 80}ms` } as React.CSSProperties}
          >
            {tier.featured ? (
              <span className="ours border-iris/40 bg-iris/10 absolute -top-3 left-6 rounded-full border px-2.5 py-0.5 text-[11px] font-medium">
                Most popular
              </span>
            ) : null}

            <div className="relative">
              <h2 className="font-editorial text-text-hi text-[22px]">{tier.name}</h2>
              <p className="text-text-mid mt-1 text-[13px]">{tier.tagline}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="tnum text-text-hi text-[36px] leading-none">
                  {tier.price}
                </span>
                {tier.unit ? (
                  <span className="text-text-low text-[14px]">{tier.unit}</span>
                ) : null}
              </div>
              <p className="text-text-low mt-1.5 text-[12px]">{tier.note}</p>
            </div>

            <ul className="relative mt-6 flex flex-1 flex-col gap-2.5">
              {tier.features.map((f) => (
                <li
                  key={f}
                  className="text-text-mid flex gap-2 text-[13px] leading-snug"
                >
                  <Check />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <Link
              href={tier.cta.href}
              className={`relative mt-7 justify-center ${
                tier.featured ? "btn btn-primary" : "btn btn-ghost"
              }`}
            >
              {tier.cta.label}
              {tier.featured ? <span aria-hidden>→</span> : null}
            </Link>
          </div>
        ))}
      </section>

      {/* Honest footnotes — licensing + info-only framing (§10). */}
      <section className="text-text-low mt-10 space-y-2 text-[12px] leading-relaxed">
        <p>
          * Real-time coverage depends on the data licence for each market; some
          exchanges remain end-of-day. Every figure states its delay and source.
        </p>
        <p>
          Pro billing is being set up — joining the waitlist reserves early-access
          pricing and does not charge you. Mizan is an{" "}
          <span className="text-text-mid">information service only</span>: it does not
          provide investment advice, trade signals, custody or execution.
        </p>
      </section>
    </div>
  );
}
