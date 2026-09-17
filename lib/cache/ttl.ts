/**
 * Cache TTLs in seconds (§6). Every external call is cached with an explicit
 * TTL — an uncached call to a rate-limited vendor is a bug (§2).
 */
export const TTL = {
  quoteLive: 45, // in-session
  quoteClosed: 15 * 60,
  indexStrip: 60,
  fxPair: 5 * 60,
  cryptoPrice: 60,
  candlesIntraday: 5 * 60,
  candlesDaily: 12 * 60 * 60,
  fundamentals: 7 * 24 * 60 * 60,
  macroSeries: 24 * 60 * 60,
  newsWire: 90,
  searchSymbol: 24 * 60 * 60,
  coverImage: 7 * 24 * 60 * 60, // stock photos are stable; cache hard.
} as const;

export type TtlKey = keyof typeof TTL;
