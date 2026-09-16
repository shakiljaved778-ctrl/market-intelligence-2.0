import { formatMoney } from "@/lib/format/currency";
import type { DisplayCurrency } from "@/lib/currency/peg";

/**
 * Sentence primitives for the computed narrative engine (§9 Stage 5). Pure and
 * deterministic — no model, no randomness. Templates select the sentence form
 * by data shape, handle plurals and sign, and NEVER assert causation the data
 * doesn't support.
 */
export const TEMPLATE_VERSION = "narrative-1";

const ORDINALS = [
  "",
  "first",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
  "eighth",
  "ninth",
  "tenth",
];

export function ordinal(n: number): string {
  return ORDINALS[n] ?? `${n}th`;
}

/** Absolute percent, one decimal, no sign (the verb carries direction). */
export function absPct(pct: number): string {
  return `${Math.abs(pct).toFixed(1)}%`;
}

export function money(usd: number, currency: DisplayCurrency): string {
  return formatMoney(usd, currency);
}

export function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

/** A short, absolute date like "14 August". */
export function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${d.toLocaleString("en-US", { month: "long", timeZone: "UTC" })}`;
}

export type MoveShape = "gain" | "loss" | "flat";

export function shapeOf(pct: number, flatBand = 0.1): MoveShape {
  if (pct > flatBand) return "gain";
  if (pct < -flatBand) return "loss";
  return "flat";
}

/** Direction verb for an index/instrument settle sentence. */
export function settleVerb(shape: MoveShape): string {
  if (shape === "gain") return "settled higher";
  if (shape === "loss") return "settled lower";
  return "was little changed";
}

export function riseFall(shape: MoveShape): string {
  if (shape === "gain") return "rose";
  if (shape === "loss") return "fell";
  return "were little changed";
}

export function advanceDecline(shape: MoveShape): string {
  return shape === "gain" ? "advance" : "decline";
}
