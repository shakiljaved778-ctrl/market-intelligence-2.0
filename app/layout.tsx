import type { Metadata, Viewport } from "next";
import "./globals.css";
import { geistMono, geistSans, newsreader } from "./fonts";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MarketStrip } from "@/components/market/MarketStrip";
import { getDisplayCurrency } from "@/lib/currency/server";
import { getTheme } from "@/lib/theme/server";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "MarketIntelligence 2.0",
    template: "%s · MarketIntelligence",
  },
  // Written to match what V1 genuinely does (§1) — no "AI-written" claim.
  description:
    "Algorithmically curated market intelligence: signal ranking, cross-source clustering, and news-to-price attribution. Not AI-written analysis.",
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

  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh">
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
