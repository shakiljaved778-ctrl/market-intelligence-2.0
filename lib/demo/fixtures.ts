import { FIXTURE_ARTICLES, type RawArticle } from "@/fixtures/articles";
import { ARTICLE_BODIES, type ArticleBody } from "@/fixtures/articles-body";
import { fixtureCandles } from "@/fixtures/candles";
import { COVER_IMAGES } from "@/fixtures/cover-images";
import { fixtureFundamentals } from "@/fixtures/fundamentals";
import { INDEX_STRIP, type IndexStripItem } from "@/fixtures/indices";
import {
  CALENDAR_EVENTS,
  MACRO_SERIES,
  YIELD_CURVE,
  type CalendarEventFixture,
  type MacroSeriesFixture,
} from "@/fixtures/macro";
import { COMMODITY_ROWS, FX_ROWS, type MarketQuoteRow } from "@/fixtures/markets-extra";
import { UNIVERSE, universeBySymbol, type UniverseRow } from "@/fixtures/universe";
import type { Candle, Fundamentals, Range } from "@/lib/providers/types";
import { isDemoMode } from "./mode";

/**
 * The ONE gateway to fixture data. Every accessor returns nothing unless
 * DEMO_MODE=1, so a fixture value can never reach a production page by
 * accident. Nothing outside `lib/demo/`, `lib/content/`, tests and scripts may
 * import from `@/fixtures` — enforced by `scripts/check-fixture-imports.mjs`.
 */
export const demo = {
  universe(): UniverseRow[] {
    return isDemoMode() ? UNIVERSE : [];
  },
  universeRow(symbol: string): UniverseRow | null {
    return isDemoMode() ? (universeBySymbol(symbol) ?? null) : null;
  },
  candles(symbol: string, range: Range): Candle[] {
    return isDemoMode() ? fixtureCandles(symbol, range) : [];
  },
  fundamentals(symbol: string): Fundamentals | null {
    return isDemoMode() ? fixtureFundamentals(symbol) : null;
  },
  indexStrip(): IndexStripItem[] {
    return isDemoMode() ? INDEX_STRIP : [];
  },
  fxRows(): MarketQuoteRow[] {
    return isDemoMode() ? FX_ROWS : [];
  },
  commodityRows(): MarketQuoteRow[] {
    return isDemoMode() ? COMMODITY_ROWS : [];
  },
  macroSeries(): MacroSeriesFixture[] {
    return isDemoMode() ? MACRO_SERIES : [];
  },
  yieldCurve(): { tenor: string; yieldPct: number }[] {
    return isDemoMode() ? YIELD_CURVE : [];
  },
  calendar(): CalendarEventFixture[] {
    return isDemoMode() ? CALENDAR_EVENTS : [];
  },
  articles(): RawArticle[] {
    return isDemoMode() ? FIXTURE_ARTICLES : [];
  },
  articleBody(id: number): ArticleBody | null {
    return isDemoMode() ? (ARTICLE_BODIES[id] ?? null) : null;
  },
  cover(id: number): { url: string; credit: string; creditUrl: string } | null {
    return isDemoMode() ? (COVER_IMAGES[id] ?? null) : null;
  },
};

export type { RawArticle, ArticleBody, UniverseRow, IndexStripItem, MarketQuoteRow };
export type { CalendarEventFixture, MacroSeriesFixture };
