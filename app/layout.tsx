import type { Metadata, Viewport } from "next";
import "./globals.css";
import { inter, jetbrainsMono, newsreader, plexArabic } from "./fonts";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { TickerTape } from "@/components/market/TickerTape";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { getDisplayCurrency } from "@/lib/currency/server";
import { getThemePref, getColorblind } from "@/lib/theme/server";
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
    default: "Mizaan Intelligence",
    template: "%s · Mizaan Intelligence",
  },
  // Rankings/clustering are computed deterministically; story summaries are
  // AI-written from cited sources.
  description:
    "Mizaan — a trusted source for market news and live data. Signal-ranked intelligence: cross-source clustering, news-to-price attribution and live quotes across global and GCC markets, with AI-written story summaries from cited sources.",
  applicationName: "Mizaan Intelligence",
  openGraph: {
    type: "website",
    siteName: "Mizaan Intelligence",
    title: "Mizaan Intelligence",
    description:
      "Signal-ranked market intelligence across global and GCC markets. Computed rankings, AI-written summaries.",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mizaan Intelligence",
    images: ["/api/og"],
  },
  alternates: { types: { "application/rss+xml": `${siteUrl}/feed.xml` } },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0d12" },
    { media: "(prefers-color-scheme: light)", color: "#f6f1e9" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [currency, themePref, colorblind] = await Promise.all([
    getDisplayCurrency(),
    getThemePref(),
    getColorblind(),
  ]);
  // "system" sets no data-theme attribute, so CSS resolves via prefers-color-scheme.
  const dataTheme = themePref === "system" ? undefined : themePref;

  // Organization + WebSite JSON-LD (§6 SEO). SearchAction points at our search API.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "Mizaan Intelligence",
        url: siteUrl,
        description:
          "Algorithmically curated market intelligence for global and GCC markets.",
      },
      {
        "@type": "WebSite",
        name: "Mizaan Intelligence",
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
      data-theme={dataTheme}
      data-cb={colorblind ? "1" : undefined}
      className={`${inter.variable} ${jetbrainsMono.variable} ${newsreader.variable} ${plexArabic.variable}`}
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
        <Header currency={currency} themePref={themePref} colorblind={colorblind} />
        <TickerTape />
        <main id="main" className="mx-auto max-w-[1320px] px-4 pb-20 md:pb-0">
          {children}
        </main>
        <Footer />
        <MobileTabBar />
      </body>
    </html>
  );
}
