import {
  Inter,
  JetBrains_Mono,
  Newsreader,
  IBM_Plex_Sans_Arabic,
} from "next/font/google";

/** Inter — UI and body text. Feature settings (cv11/ss01/ss03) applied in CSS. */
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/** JetBrains Mono — tickers, quotes and every table figure (tabular-nums). */
export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

/** Newsreader — editorial display serif (headlines, recaps, article body). */
export const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
  style: ["normal", "italic"],
});

/** IBM Plex Sans Arabic — GCC-ready Arabic, applied via :lang(ar). */
export const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-arabic",
  display: "swap",
});
