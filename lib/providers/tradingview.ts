/**
 * TradingView "Market Quotes" widget — Qatar Stock Exchange prices (owner
 * decision, 2026-11-27: "go ahead with the TradingView widget for QSE").
 *
 * This is a deliberate, scoped exception to two standing rules, recorded in
 * CLAUDE.md: the widget is TradingView's own embed, loaded in the reader's
 * browser, and its prices carry TradingView's attribution and delay rather
 * than our PriceStamp. TradingView holds the exchange licence for the delayed
 * prices it shows. Nothing here is fetched, cached or stored by Mizaan, and no
 * figure from the widget feeds our rankings, charts or other pages.
 *
 * Kept in lib/providers so every vendor address lives in one place.
 */
export const TRADINGVIEW_QUOTES_SCRIPT =
  "https://s3.tradingview.com/external-embedding/embed-widget-market-quotes.js";

export const TRADINGVIEW_HOME = "https://www.tradingview.com/";

/** The QE General Index on TradingView. */
export const QSE_INDEX_SYMBOL = "QSE:GNRI";

/**
 * QSE stocks in the widget — the largest names on our QSE roster
 * (content/gcc-companies.ts), by their QSE ticker codes.
 */
export const QSE_WIDGET_STOCKS: readonly { symbol: string; label: string }[] = [
  { symbol: "QNBK", label: "QNB" },
  { symbol: "IQCD", label: "Industries Qatar" },
  { symbol: "QIBK", label: "Qatar Islamic Bank" },
  { symbol: "MARK", label: "Masraf Al Rayan" },
  { symbol: "CBQK", label: "Commercial Bank" },
  { symbol: "ORDS", label: "Ooredoo" },
  { symbol: "QEWS", label: "Qatar Electricity & Water" },
  { symbol: "QGTS", label: "Nakilat" },
  { symbol: "QFLS", label: "Qatar Fuel (WOQOD)" },
  { symbol: "MPHC", label: "Mesaieed Petrochemical" },
];

export interface MarketQuotesConfig {
  width: string;
  height: number;
  symbolsGroups: {
    name: string;
    symbols: { name: string; displayName: string }[];
  }[];
  showSymbolLogo: boolean;
  isTransparent: boolean;
  colorTheme: "light" | "dark";
  locale: string;
}

/** PURE: the widget configuration for one colour theme. */
export function qseWidgetConfig(
  theme: "light" | "dark",
  height: number,
): MarketQuotesConfig {
  return {
    width: "100%",
    height,
    symbolsGroups: [
      {
        name: "Qatar Stock Exchange",
        symbols: [
          { name: QSE_INDEX_SYMBOL, displayName: "QE Index" },
          ...QSE_WIDGET_STOCKS.map((s) => ({
            name: `QSE:${s.symbol}`,
            displayName: s.label,
          })),
        ],
      },
    ],
    showSymbolLogo: true,
    isTransparent: true,
    colorTheme: theme,
    locale: "en",
  };
}
