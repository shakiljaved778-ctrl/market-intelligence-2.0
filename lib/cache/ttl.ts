/**
 * Cache TTLs in seconds (§6). Every external call is cached with an explicit
 * TTL — an uncached call to a rate-limited vendor is a bug (§2).
 */
export const TTL = {
  quoteLive: 45, // in-session (provider-level cache)
  // Last-known-good quote primed by the quotes job. Long-lived on purpose: the
  // job may run late, and a stored price that states its own time is honest —
  // an expired one silently replaced by nothing (or a fixture) is not.
  quoteLastKnown: 7 * 24 * 60 * 60,
  fxReference: 60 * 60, // ECB reference rates change once a day
  macroRefresh: 3 * 60 * 60, // job-side refresh window for FRED / World Bank
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
