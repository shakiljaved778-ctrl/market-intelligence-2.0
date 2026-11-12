/**
 * Demo mode — the ONLY switch that lets fixture data reach a page.
 *
 * Production never sets it: every number a reader sees comes from a real
 * provider, carries its source and time, or is replaced by an empty state.
 * `DEMO_MODE=1` is for local development, unit tests, the visual-regression
 * suite and CI builds, where the committed fixtures stand in for live feeds and
 * the UI shows a "Demo data" banner so the two can never be confused.
 */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "1";
}
