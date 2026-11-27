import { describe, expect, it } from "vitest";
import { GCC_PEGS } from "./gcc-pegs";
import { QAR_PER_USD } from "@/lib/currency/peg";

describe("GCC currency pegs", () => {
  it("covers all six GCC currencies once", () => {
    expect(GCC_PEGS.map((p) => p.code).sort()).toEqual([
      "AED",
      "BHD",
      "KWD",
      "OMR",
      "QAR",
      "SAR",
    ]);
  });
  it("uses the site's own QAR peg constant", () => {
    expect(GCC_PEGS.find((p) => p.code === "QAR")?.perUsd).toBe(QAR_PER_USD);
  });
  it("gives no fixed rate for Kuwait's basket peg", () => {
    expect(GCC_PEGS.find((p) => p.code === "KWD")?.perUsd).toBeNull();
  });
});
