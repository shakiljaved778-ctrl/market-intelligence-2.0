import type { Metadata } from "next";
import { BrandMark } from "@/components/ui/BrandMark";
import { ACTIVE_MARK, TAGLINE_OPTIONS } from "@/content/brand";

/**
 * Brand proposals (pre-launch brief §8). Not linked from the site and not
 * indexed. Shows each proposal on light and dark, at header, favicon and
 * social-card sizes. The live logo is unchanged until the owner chooses.
 */
export const metadata: Metadata = {
  title: "Brand proposals",
  robots: { index: false, follow: false },
};

// The site's own light and dark canvas, ink and saffron (app/globals.css).
const LIGHT = { background: "#f6f1e9", color: "#12151a" };
const DARK = { background: "#0a0d12", color: "#eceef1" };

const FILES = [
  ["A — Beam M (mark)", "/brand/proposals/a-beam-mark.svg"],
  ["B — Bilingual wordmark", "/brand/proposals/b-bilingual-wordmark.svg"],
  [
    "C — Monogram tile (favicon, app icon, avatar)",
    "/brand/proposals/c-monogram-tile.svg",
  ],
] as const;

function Panel({ dark, children }: { dark?: boolean; children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-[120px] items-center justify-center gap-6 rounded-[10px] p-6"
      style={dark ? DARK : LIGHT}
    >
      {children}
    </div>
  );
}

function Wordmark({ mark }: { mark: "current" | "beam" }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <BrandMark size={28} variant={mark} />
      <span className="font-serif text-[20px] font-semibold tracking-[0.14em]">
        MIZAAN
      </span>
    </span>
  );
}

/** Proposal C, drawn inline (same artwork as c-monogram-tile.svg). */
function MonogramTile({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label={`Monogram tile, ${size} px`}
    >
      <rect width="32" height="32" rx="7" fill="#12151a" />
      <g transform="translate(4,4)">
        <path
          d="M2.6 5.2 H21.4"
          fill="none"
          stroke="#f6f1e9"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M5 20 V9.2 L12 15.4 L19 9.2 V20"
          fill="none"
          stroke="#f6f1e9"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect
          x="10.3"
          y="3.5"
          width="3.4"
          height="3.4"
          rx="0.4"
          transform="rotate(45 12 5.2)"
          fill="#e8a93b"
        />
      </g>
    </svg>
  );
}

function Bilingual() {
  return (
    <span className="inline-flex items-center gap-4">
      <span className="font-serif text-[22px] font-semibold tracking-[0.18em]">
        MIZAAN
      </span>
      <span
        aria-hidden
        className="h-8 w-px opacity-40"
        style={{ background: "currentColor" }}
      />
      <span lang="ar" dir="rtl" className="font-serif text-[26px]">
        ميزان
      </span>
    </span>
  );
}

export default function BrandPreviewPage() {
  return (
    <div className="mx-auto max-w-[1100px] py-10">
      <p className="t-micro text-ink-3">Not public · noindex</p>
      <h1 className="t-h1 font-editorial text-ink mt-2">Brand proposals</h1>
      <p className="text-ink-2 mt-3 max-w-[70ch] text-[15px] leading-relaxed">
        Mizaan (ميزان) means balance, the scale: fair weighing, which is what the site
        does with news and data. The logo in use is unchanged (
        <code>ACTIVE_MARK = &quot;{ACTIVE_MARK}&quot;</code> in{" "}
        <code>content/brand.ts</code>); adopting proposal A is that one line. The
        bilingual wordmark needs an Arabic typeface to be chosen and self-hosted first
        (Amiri or Noto Naskh Arabic, both open-licensed); here it uses your
        system&rsquo;s Arabic font.
      </p>

      <h2 className="t-h3 font-editorial text-ink mt-10 mb-3">In the header</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Panel>
          <Wordmark mark="current" />
          <span className="text-[12px] opacity-60">current</span>
        </Panel>
        <Panel dark>
          <Wordmark mark="current" />
          <span className="text-[12px] opacity-60">current</span>
        </Panel>
        <Panel>
          <Wordmark mark="beam" />
          <span className="text-[12px] opacity-60">A — beam M</span>
        </Panel>
        <Panel dark>
          <Wordmark mark="beam" />
          <span className="text-[12px] opacity-60">A — beam M</span>
        </Panel>
        <Panel>
          <Bilingual />
        </Panel>
        <Panel dark>
          <Bilingual />
        </Panel>
      </div>

      <h2 className="t-h3 font-editorial text-ink mt-10 mb-3">
        As a favicon and app icon
      </h2>
      <Panel>
        <MonogramTile size={16} />
        <MonogramTile size={32} />
        <MonogramTile size={180} />
      </Panel>

      <h2 className="t-h3 font-editorial text-ink mt-10 mb-3">On a social card</h2>
      <div
        className="flex aspect-[1200/630] max-w-[600px] flex-col justify-between rounded-[12px] p-8"
        style={DARK}
      >
        <Wordmark mark="beam" />
        <p className="font-sans text-[26px] leading-tight font-bold">
          QIIB issues $500 million senior unsecured sukuk
        </p>
        <p className="text-[13px] opacity-70">{TAGLINE_OPTIONS[0]}</p>
      </div>

      <h2 className="t-h3 font-editorial text-ink mt-10 mb-3">Source files</h2>
      <ul className="text-ink-2 list-disc pl-5 text-[14px]">
        {FILES.map(([label, href]) => (
          <li key={href}>
            <a href={href} className="underline">
              {label}
            </a>
          </li>
        ))}
      </ul>

      <h2 className="t-h3 font-editorial text-ink mt-10 mb-3">Tagline options</h2>
      <ol className="text-ink list-decimal pl-5 font-serif text-[18px]">
        {TAGLINE_OPTIONS.map((t) => (
          <li key={t} className="mt-1">
            {t}
          </li>
        ))}
      </ol>
    </div>
  );
}
