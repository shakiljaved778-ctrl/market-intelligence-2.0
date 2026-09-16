import { Geist, Geist_Mono, Newsreader } from "next/font/google";

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

/** Newsreader — headlines and recap body; editorial weight without pastiche (§12). */
export const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
  style: ["normal", "italic"],
});
