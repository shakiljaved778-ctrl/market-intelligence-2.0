import { describe, expect, it } from "vitest";
import { GCC_COMPANIES } from "@/content/gcc-companies";
import { QSE_INDEX_SYMBOL, QSE_WIDGET_STOCKS, qseWidgetConfig } from "./tradingview";

describe("QSE TradingView widget", () => {
  it("shows only stocks on our QSE roster", () => {
    const qse = new Set(
      GCC_COMPANIES.filter((c) => c.exchange === "qse").map((c) => c.symbol),
    );
    for (const s of QSE_WIDGET_STOCKS) expect(qse.has(s.symbol)).toBe(true);
  });

  it("lists the index first, then each stock under the QSE exchange prefix", () => {
    const cfg = qseWidgetConfig("dark", 500);
    const names = cfg.symbolsGroups[0]!.symbols.map((s) => s.name);
    expect(names[0]).toBe(QSE_INDEX_SYMBOL);
    expect(names.slice(1)).toEqual(QSE_WIDGET_STOCKS.map((s) => `QSE:${s.symbol}`));
    expect(names.every((n) => n.startsWith("QSE:"))).toBe(true);
    expect(cfg.colorTheme).toBe("dark");
  });
});
