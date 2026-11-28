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

  it("catches inflected and hedged forecasts", async () => {
    const { speculativePhrases } = await import("./groq");
    expect(
      speculativePhrases(
        "Calm markets, setting the tone for investors. The IPO wave is set to continue; the deal could channel capital and may prompt scrutiny, suggesting that regulators will monitor it. Traders will keep an eye on oil.",
        "IPO wave; oil steady.",
      ),
    ).toEqual([
      "setting the tone",
      "is set to",
      "could channel",
      "may prompt",
      "will monitor",
      "will keep an eye",
      "suggesting that regulators will",
    ]);
  });

  it("leaves plain past-tense reporting alone", async () => {
    const { speculativePhrases } = await import("./groq");
    expect(
      speculativePhrases(
        "The index slipped 0.85 percent. The ECB said OpenAI and Anthropic plan to follow. OPEC meets on Sunday, the agency reported.",
        "index slipped",
      ),
    ).toEqual([]);
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

describe("Mizaan Original — read-time exclusions", () => {
  it("flags Qatar political wording the site would hide", async () => {
    const { originalExclusions } = await import("./groq");
    const found = originalExclusions(
      "The Qatar Stock Exchange slipped 0.85 percent. Geopolitical risk weighed on oil, and the Qatari-German ties with Berlin deepened.",
    );
    expect(found.map((f) => f.toLowerCase())).toEqual(
      expect.arrayContaining(["geopolitical", "ties with"]),
    );
  });

  it("passes a Qatar markets piece with no political wording", async () => {
    const { originalExclusions } = await import("./groq");
    expect(
      originalExclusions(
        "The Qatar Stock Exchange index slipped 0.85 percent to 9,993 points as all sectors fell, the Qatar News Agency reported.",
      ),
    ).toEqual([]);
  });
});

describe("Groq daily allowance", () => {
  it("reports the daily limit only until it resets", async () => {
    const { groqDailyLimitReached, __setGroqDailyLimitUntil } = await import("./groq");
    __setGroqDailyLimitUntil(1_000);
    expect(groqDailyLimitReached(999)).toBe(true);
    expect(groqDailyLimitReached(1_001)).toBe(false);
    __setGroqDailyLimitUntil(0);
  });
});

describe("Groq daily limit is per model (2026-11-28)", () => {
  it("one spent model does not stop the others; all spent stops everything", async () => {
    const { groqDailyLimitReached, __setGroqDailyLimitUntil } = await import("./groq");
    __setGroqDailyLimitUntil(0);
    __setGroqDailyLimitUntil(1_000, "openai/gpt-oss-120b");
    expect(groqDailyLimitReached(500, "openai/gpt-oss-120b")).toBe(true);
    expect(groqDailyLimitReached(500, "openai/gpt-oss-20b")).toBe(false);
    expect(groqDailyLimitReached(500)).toBe(false);
    __setGroqDailyLimitUntil(1_000);
    expect(groqDailyLimitReached(500)).toBe(true);
    __setGroqDailyLimitUntil(0);
  });

  it("writes the brief with the next model when the first one's allowance is spent", async () => {
    const { vi } = await import("vitest");
    process.env.GROQ_API_KEY = "test";
    const groq = await import("./groq");
    groq.__setGroqPacing(0);
    groq.__setGroqDailyLimitUntil(0);
    const asked: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: { body: string }) => {
        const model = JSON.parse(init.body).model as string;
        asked.push(model);
        if (model === "openai/gpt-oss-120b") {
          return new Response(
            "Rate limit reached for model on tokens per day (TPD). Please try again in 2h3m.",
            { status: 429 },
          );
        }
        return Response.json({
          choices: [{ message: { content: "Apple reported results, Reuters said." } }],
        });
      }),
    );
    const brief = await groq.generateBrief(`t-${Date.now()}`, {
      title: "Apple reports results",
      section: "markets",
      sources: ["Reuters"],
    });
    expect(asked.slice(0, 2)).toEqual(["openai/gpt-oss-120b", "openai/gpt-oss-20b"]);
    expect(brief?.model).toBe("openai/gpt-oss-20b");
    expect(groq.groqDailyLimitReached(Date.now(), "openai/gpt-oss-120b")).toBe(true);
    vi.unstubAllGlobals();
    groq.__setGroqDailyLimitUntil(0);
    delete process.env.GROQ_API_KEY;
  });
});

describe("forecast sentences are dropped, not published (2026-11-28)", () => {
  it("removes only the sentences with forecast wording, keeping headline and dek", async () => {
    const { dropSentencesWith, speculativePhrases } = await import("./groq");
    const text = [
      "# Markets steady as oil slips",
      "Dek: Stocks held gains while crude fell, Reuters reported.",
      "",
      "Stocks held gains on Friday. Oil fell 1.2 percent. The move could support airlines next week.",
      "Gold steadied. That is unlikely to last.",
    ].join("\n");
    const out = dropSentencesWith(text, ["could support", "is unlikely to"]);
    expect(out).toContain("# Markets steady as oil slips");
    expect(out).toContain("Dek: Stocks held gains");
    expect(out).toContain("Oil fell 1.2 percent.");
    expect(out).toContain("Gold steadied.");
    expect(speculativePhrases(out, "")).toEqual([]);
  });
});

describe("empty answers from a reasoning model are retried with a larger budget", () => {
  it("retries once with more tokens, then succeeds", async () => {
    const { vi } = await import("vitest");
    process.env.GROQ_API_KEY = "test";
    const groq = await import("./groq");
    groq.__setGroqPacing(0);
    groq.__setGroqDailyLimitUntil(0);
    const budgets: number[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: { body: string }) => {
        const body = JSON.parse(init.body) as { max_tokens: number };
        budgets.push(body.max_tokens);
        const content =
          budgets.length === 1 ? "" : "Apple reported results, Reuters said.";
        return Response.json({ choices: [{ message: { content } }] });
      }),
    );
    const brief = await groq.generateBrief(`e-${Date.now()}`, {
      title: "Apple reports results",
      section: "markets",
      sources: ["Reuters"],
    });
    expect(brief?.body).toContain("Apple");
    expect(budgets[1]).toBe(budgets[0]! * 2);
    vi.unstubAllGlobals();
    delete process.env.GROQ_API_KEY;
  });
});

describe("a rejected Original draft lets the next model try (2026-11-28)", () => {
  it("publishes the second model's clean draft after the first invents a figure", async () => {
    const { vi } = await import("vitest");
    process.env.GROQ_API_KEY = "test";
    const groq = await import("./groq");
    groq.__setGroqPacing(0);
    groq.__setGroqDailyLimitUntil(0);
    const filler = Array.from(
      { length: 420 },
      (_, i) =>
        ["markets", "held", "steady", "while", "traders", "watched", "oil"][i % 7],
    ).join(" ");
    const clean = `# Markets hold steady as oil eases\nDek: Stocks were little changed while crude slipped, according to the reports.\n\n${filler}.`;
    const invented = clean.replace("Stocks were", "Stocks rose 9999 points and were");
    const models: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: { body: string }) => {
        const model = (JSON.parse(init.body) as { model: string }).model;
        models.push(model);
        // Whichever model is asked first invents a figure (draft and rewrite).
        const content = model === models[0] ? invented : clean;
        return Response.json({ choices: [{ message: { content } }] });
      }),
    );
    const report = (t: string) => ({
      title: t,
      dek: "Markets held steady.",
      source: "Reuters",
    });
    const out = await groq.generateOriginal({
      reports: [report("Stocks steady"), report("Oil eases"), report("Bonds firm")],
      date: "2026-11-28T10:00:00Z",
    });
    expect(new Set(models).size).toBe(2);
    expect(out?.model).toBe(models.at(-1));
    expect(out?.model).not.toBe(models[0]);
    expect(out?.dek).not.toContain("9999");
    vi.unstubAllGlobals();
    delete process.env.GROQ_API_KEY;
  });
});
