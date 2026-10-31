import { Geist, Geist_Mono, Newsreader, Playfair_Display } from "next/font/google";

/** Geist Sans — interface text (§12). */
export const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

/** Geist Mono — every price, percentage and table figure, with tabular-nums (§12). */
export const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

/** Newsreader — recap body and inner-page editorial serif (§12). */
export const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
  style: ["normal", "italic"],
});

/** Playfair Display — the high-contrast serif masthead (rebrand, ref: the golf
 * landing's editorial display type). Used for the hero + big marketing titles. */
export const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  style: ["normal", "italic"],
});
