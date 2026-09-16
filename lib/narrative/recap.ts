import type { DisplayCurrency } from "@/lib/currency/peg";
import {
  absPct,
  advanceDecline,
  money,
  ordinal,
  plural,
  riseFall,
  settleVerb,
  shapeOf,
  shortDate,
  TEMPLATE_VERSION,
} from "./templates";

/**
 * Computed recaps (§9 Stage 5). Each generator is a PURE function of its
 * `inputs` — the exact reproducibility asserted by the gate. Output is factual
 * prose built from our own numbers, degrading to fewer sentences rather than
 * emitting filler, and never asserting causation.
 */
export interface RecapOutput {
  bodyMd: string;
  templateVersion: string;
  inputs: unknown;
}

// --- Per-instrument "how it moved" ------------------------------------------

export interface InstrumentRecapInput {
  name: string;
  currency: DisplayCurrency;
  priceUsd: number;
  changePct: number;
  /** Consecutive same-direction sessions ending today (≥2 to mention). */
  streakLength: number;
  streakShape: "gain" | "loss" | null;
  /** A new period extreme close, if any. */
  extremum: { kind: "high" | "low"; sinceDate: string } | null;
  /** True if today's direction flipped the prior session. */
  reversed: boolean;
}

export function instrumentRecap(input: InstrumentRecapInput): RecapOutput {
  const shape = shapeOf(input.changePct);
  const sentences: string[] = [];

  // Sentence 1 — the settle.
  if (shape === "flat") {
    sentences.push(
      `${input.name} was little changed at ${money(input.priceUsd, input.currency)}.`,
    );
  } else {
    sentences.push(
      `${input.name} ${settleVerb(shape)} at ${money(input.priceUsd, input.currency)}, ${absPct(input.changePct)} ${shape === "gain" ? "up" : "down"} on the session.`,
    );
  }

  // Sentence 2 — one context clause, by data shape (priority: extreme > streak >
  // reversal). A clause is emitted ONLY when it is consistent with the settle
  // direction, so the recap never asserts something the session contradicts
  // (e.g. "settled higher … a consecutive decline"). Prefer fewer sentences.
  const extremumConsistent =
    input.extremum &&
    ((input.extremum.kind === "low" && shape !== "gain") ||
      (input.extremum.kind === "high" && shape !== "loss"));
  const streakConsistent =
    input.streakShape && input.streakLength >= 3 && input.streakShape === shape;

  if (extremumConsistent && input.extremum) {
    sentences.push(
      `That is the ${input.extremum.kind === "low" ? "lowest" : "highest"} close since ${shortDate(input.extremum.sinceDate)}.`,
    );
  } else if (streakConsistent && input.streakShape) {
    sentences.push(
      `It was a ${ordinal(input.streakLength)} consecutive ${advanceDecline(input.streakShape)}.`,
    );
  } else if (input.reversed && shape !== "flat") {
    sentences.push(`The move reversed the prior session's direction.`);
  }

  return {
    bodyMd: sentences.join(" "),
    templateVersion: TEMPLATE_VERSION,
    inputs: input,
  };
}

// --- Session open / close ----------------------------------------------------

export interface SessionRecapInput {
  kind: "session_open" | "session_close";
  currency: DisplayCurrency;
  date: string;
  indices: { name: string; changePct: number }[];
  breadth?: { advancers: number; decliners: number };
  topMover?: { name: string; changePct: number };
  weakestSector?: string;
}

export function sessionRecap(input: SessionRecapInput): RecapOutput {
  const sentences: string[] = [];
  const label = input.kind === "session_open" ? "opened" : "closed";

  // Sentence 1 — indices.
  if (input.indices.length > 0) {
    const shapes = input.indices.map((i) => shapeOf(i.changePct));
    const allUp = shapes.every((s) => s === "gain");
    const allDown = shapes.every((s) => s === "loss");
    const lead = input.indices[0];
    if (lead) {
      if (allUp || allDown) {
        const parts = input.indices.map(
          (i) =>
            `${i.name} ${absPct(i.changePct)} ${i.changePct >= 0 ? "higher" : "lower"}`,
        );
        sentences.push(
          `Markets ${label} ${allUp ? "higher" : "lower"}, ${parts.join(", ")}.`,
        );
      } else {
        sentences.push(
          `Markets ${label} mixed: ${input.indices
            .map((i) => `${i.name} ${riseFall(shapeOf(i.changePct))}`)
            .join(", ")}.`,
        );
      }
    }
  }

  // Sentence 2 — top mover (no causation).
  if (input.topMover) {
    const s = shapeOf(input.topMover.changePct);
    if (s !== "flat") {
      sentences.push(
        `${input.topMover.name} was the standout, ${absPct(input.topMover.changePct)} ${s === "gain" ? "higher" : "lower"}.`,
      );
    }
  }

  // Sentence 3 — breadth.
  if (input.breadth) {
    const { advancers, decliners } = input.breadth;
    sentences.push(
      `Breadth favoured ${advancers >= decliners ? "advancers" : "decliners"}, ${advancers} ${plural(advancers, "gainer", "gainers")} to ${decliners} ${plural(decliners, "decliner", "decliners")}.`,
    );
  }

  if (input.weakestSector) {
    sentences.push(`${input.weakestSector} was the weakest of the sectors tracked.`);
  }

  return {
    bodyMd: sentences.join(" "),
    templateVersion: TEMPLATE_VERSION,
    inputs: input,
  };
}

// --- Weekly wrap -------------------------------------------------------------

export interface WeeklyRecapInput {
  currency: DisplayCurrency;
  weekEnding: string;
  index: { name: string; changePct: number };
  best?: { name: string; changePct: number };
  worst?: { name: string; changePct: number };
}

export function weeklyRecap(input: WeeklyRecapInput): RecapOutput {
  const shape = shapeOf(input.index.changePct);
  const sentences: string[] = [
    shape === "flat"
      ? `${input.index.name} ended the week to ${shortDate(input.weekEnding)} little changed.`
      : `${input.index.name} ${shape === "gain" ? "gained" : "lost"} ${absPct(input.index.changePct)} over the week to ${shortDate(input.weekEnding)}.`,
  ];
  if (input.best && input.worst) {
    sentences.push(
      `${input.best.name} led with ${absPct(input.best.changePct)}, while ${input.worst.name} lagged at ${absPct(input.worst.changePct)}.`,
    );
  }
  return {
    bodyMd: sentences.join(" "),
    templateVersion: TEMPLATE_VERSION,
    inputs: input,
  };
}
