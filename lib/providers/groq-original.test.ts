import { describe, expect, it } from "vitest";
import { parseOriginal } from "./groq";

const para = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(" ");

describe("Mizaan Original — parsing the model's output", () => {
  it("splits headline, dek and body", () => {
    const text = `# Markets steady as rate bets firm\nDek: Equities held gains while bond yields eased, Reuters reported.\n\n${para(300)}\n\n## What moved\n${para(20)}`;
    const o = parseOriginal(text);
    expect(o?.title).toBe("Markets steady as rate bets firm");
    expect(o?.dek).toBe(
      "Equities held gains while bond yields eased, Reuters reported.",
    );
    expect(o?.body.startsWith("word0")).toBe(true);
    expect(o?.body).toContain("## What moved");
  });

  it("rejects output without a headline or dek, or too short — never publishes it", () => {
    expect(parseOriginal(`Dek: x\n${para(400)}`)).toBeNull();
    expect(parseOriginal(`# Title\n${para(400)}`)).toBeNull();
    expect(parseOriginal(`# Title\nDek: one line\n${para(50)}`)).toBeNull();
  });
});

describe("Mizaan Original — no forecasts", () => {
  it("flags forecast wording the reports never use", async () => {
    const { speculativePhrases } = await import("./groq");
    expect(
      speculativePhrases(
        "Oil will likely set the tone in the weeks ahead.",
        "Oil prices steady; OPEC meets next week.",
      ),
    ).toEqual(["will likely", "set the tone", "in the weeks ahead"]);
  });

  it("allows wording a report itself uses (attributed)", async () => {
    const { speculativePhrases } = await import("./groq");
    expect(
      speculativePhrases(
        "The bank said rates are expected to stay on hold.",
        "Rates are expected to stay on hold, the bank said.",
      ),
    ).toEqual([]);
  });
});
