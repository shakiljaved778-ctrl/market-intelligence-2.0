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
import { siteLd } from "@/lib/seo";
import { SITE } from "@/content/site.config";
import { isDemoMode } from "@/lib/demo/mode";

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
    default: SITE.title,
    template: `%s | ${SITE.shortName}`,
  },
  // Copy lives in content/site.config.ts and must only claim what the site
  // delivers: ranked news from cited sources, and source-stamped market data.
  description: SITE.description,
  applicationName: SITE.name,
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: SITE.name,
    description: SITE.socialDescription,
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.name,
    description: SITE.socialDescription,
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

  // Organization + WebSite JSON-LD (§6 SEO), built from our own constants.
  const jsonLd = siteLd();

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
        {isDemoMode() ? (
          <p
            role="note"
            className="bg-surface-2 text-ink-2 border-hairline border-b px-4 py-1.5 text-center text-[12px]"
          >
            Demo mode — figures and stories on this page are sample data, not market
            data.
          </p>
        ) : null}
        <Header currency={currency} themePref={themePref} />
        <TickerTape />
        <main id="main" className="mx-auto max-w-[1320px] px-4 pb-20 md:pb-0">
          {children}
        </main>
        <Footer colorblind={colorblind} />
        <MobileTabBar />
      </body>
    </html>
  );
}
