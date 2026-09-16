import type { Metadata, Viewport } from "next";
import "./globals.css";
import { geistMono, geistSans, newsreader } from "./fonts";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MarketStrip } from "@/components/market/MarketStrip";
import { getDisplayCurrency } from "@/lib/currency/server";
import { getTheme } from "@/lib/theme/server";
import { SITE_URL } from "@/lib/site";

const siteUrl = SITE_URL;

// Never let a bad value crash the build (metadataBase is optional).
function safeUrl(value: string): URL | undefined {
  try {
    return new URL(value);
  } catch {
    return undefined;
  }
}

export const metadata: Metadata = {
  metadataBase: safeUrl(siteUrl),
  title: {
    default: "Mizan — market intelligence",
    template: "%s · Mizan",
  },
  // Written to match what V1 genuinely does (§1) — no "AI-written" claim.
  description:
    "Mizan: algorithmically curated market intelligence — signal ranking, cross-source clustering, and news-to-price attribution across global and GCC markets. Not AI-written analysis.",
  applicationName: "Mizan",
  openGraph: {
    type: "website",
    siteName: "Mizan",
    title: "Mizan — market intelligence",
    description:
      "Signal-ranked market intelligence across global and GCC markets. Computed, not AI-written.",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mizan — market intelligence",
    images: ["/api/og"],
  },
  alternates: { types: { "application/rss+xml": `${siteUrl}/feed.xml` } },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0c0e11" },
    { media: "(prefers-color-scheme: light)", color: "#f3f4f1" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [currency, theme] = await Promise.all([getDisplayCurrency(), getTheme()]);

  // Organization + WebSite JSON-LD (§6 SEO). SearchAction points at our search API.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "Mizan",
        url: siteUrl,
        description:
          "Algorithmically curated market intelligence for global and GCC markets.",
      },
      {
        "@type": "WebSite",
        name: "Mizan",
        url: siteUrl,
        potentialAction: {
          "@type": "SearchAction",
          target: `${siteUrl}/api/market/search?q={query}`,
          "query-input": "required name=query",
        },
      },
    ],
  };

  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh">
        <script
          type="application/ld+json"
          // JSON-LD is static, computed above from our own constants.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <a
          href="#main"
          className="focus:bg-raised focus:text-text-hi sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-[6px] focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <Header currency={currency} theme={theme} />
        <MarketStrip />
        <main id="main" className="mx-auto max-w-[1280px] px-4">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
