/**
 * Brand switch (pre-launch brief §8, 2026-11-27). The logo in use is "current"
 * (the geometric M). Proposals are shown at /brand-preview; adopting one is a
 * one-line change here once the owner chooses — nothing else to edit.
 *
 *   "current" — geometric capital M with the ◆ pivot (in use)
 *   "beam"    — proposal A: a level beam with the ◆ pivot, the M hanging beneath
 */
export type MarkId = "current" | "beam";

export const ACTIVE_MARK: MarkId = "current";

/** Tagline options for the owner to choose from (not yet used on the site). */
export const TAGLINE_OPTIONS: readonly string[] = [
  "The Gulf's markets, weighed.",
  "Weighing what moves markets.",
  "Signal over noise, from Doha to Wall Street.",
];
