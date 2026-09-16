"use client";

import { useEffect, useRef, useState } from "react";
import type { IChartApi } from "lightweight-charts";
import type { Range } from "@/lib/providers/types";

const RANGES: Range[] = ["1D", "5D", "1M", "6M", "YTD", "1Y", "5Y"];

interface CandlePoint {
  t: string;
  c: number;
}

/**
 * Price chart (§13) using TradingView Lightweight Charts. Fetches candles from
 * the cache-backed API (never a vendor), switches ranges, and colours the area
 * by overall direction. Respects prefers-reduced-motion implicitly (no entrance
 * animation is used).
 */
export function PriceChart({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState<Range>("1M");
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    let disposed = false;
    let chart: IChartApi | null = null;

    async function draw() {
      setLoading(true);
      setEmpty(false);
      const [{ createChart, ColorType }, res] = await Promise.all([
        import("lightweight-charts"),
        fetch(
          `/api/market/candles?symbol=${encodeURIComponent(symbol)}&range=${range}`,
        ),
      ]);
      if (disposed || !containerRef.current) return;

      const data = (await res.json()) as { candles: CandlePoint[] };
      const points = data.candles.map((c) => ({
        time: Math.floor(new Date(c.t).getTime() / 1000) as never,
        value: c.c,
      }));
      if (points.length === 0) {
        setEmpty(true);
        setLoading(false);
        return;
      }

      const css = getComputedStyle(document.documentElement);
      const rise = (points.at(-1)?.value ?? 0) >= (points[0]?.value ?? 0);
      const line = css.getPropertyValue(rise ? "--gain" : "--loss").trim() || "#2BB673";
      const textLow = css.getPropertyValue("--text-low").trim() || "#6B7280";
      const lineColor = css.getPropertyValue("--line").trim() || "#2A2F36";

      containerRef.current.innerHTML = "";
      chart = createChart(containerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: textLow,
          fontFamily: "var(--font-mono)",
          attributionLogo: false,
        },
        grid: {
          vertLines: { visible: false },
          horzLines: { color: lineColor },
        },
        rightPriceScale: { borderColor: lineColor },
        timeScale: {
          borderColor: lineColor,
          timeVisible: range === "1D" || range === "5D",
        },
        height: 320,
        autoSize: true,
        handleScroll: false,
        handleScale: false,
      });
      const series = chart.addAreaSeries({
        lineColor: line,
        topColor: `${line}44`,
        bottomColor: `${line}05`,
        lineWidth: 2,
        priceLineVisible: false,
      });
      series.setData(points);
      setLoading(false);
    }

    void draw();
    return () => {
      disposed = true;
      chart?.remove();
    };
  }, [symbol, range]);

  return (
    <div>
      <div role="group" aria-label="Chart range" className="mb-3 flex flex-wrap gap-1">
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            aria-pressed={r === range}
            className={`tnum rounded-[6px] px-2.5 py-1 text-[13px] transition-colors ${
              r === range
                ? "bg-raised text-text-hi"
                : "text-text-mid hover:text-text-hi"
            }`}
          >
            {r}
          </button>
        ))}
      </div>
      <div className="relative">
        <div ref={containerRef} className="h-[320px] w-full" />
        {loading ? (
          <p className="text-text-low absolute top-2 left-0 text-[12px]">Loading…</p>
        ) : null}
        {empty ? (
          <p className="text-text-mid absolute inset-0 flex items-center justify-center text-[13px]">
            No price history for this range.
          </p>
        ) : null}
      </div>
    </div>
  );
}
