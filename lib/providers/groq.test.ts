import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __setGroqPacing,
  BRIEF_MIN_WORDS,
  BRIEF_TARGET_WORDS,
  generateBrief,
  ungroundedFigures,
  wordCount,
} from "./groq";

describe("groq brief length", () => {
  it("counts words, ignoring markdown markers", () => {
    expect(
      wordCount("## The details\n\nOil rose 2% on Friday. **Why it matters:** —"),
    ).toBe(10);
  });

  it("rewrites anything below the minimum, which sits under the target", () => {
    expect(BRIEF_MIN_WORDS).toBeLessThan(BRIEF_TARGET_WORDS.min);
  });
});

describe("generateBrief", () => {
  const ok = (content: string) =>
    new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
      status: 200,
    });

  beforeEach(() => {
    __setGroqPacing(0);
    process.env.GROQ_API_KEY = "test-key";
    process.env.GROQ_MODEL = "test-model";
  });
  afterEach(() => {
    delete process.env.GROQ_API_KEY;
    delete process.env.GROQ_MODEL;
    vi.unstubAllGlobals();
  });

  it("asks for the sectioned format and the accuracy rules", async () => {
    const fetchMock = vi.fn(async () => ok("Body."));
    vi.stubGlobal("fetch", fetchMock);
    await generateBrief("prompt-check", {
      title: "Oman crude price rises",
      section: "markets",
    });
    const body = JSON.parse(
      (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string,
    );
    const system = body.messages[0].content as string;
    expect(system).toContain("## The details");
    expect(system).toContain("never state which organisations anyone belongs to");
    expect(system).toContain("Use no number that is not in the facts");
  });

  it("waits and retries once when rate-limited", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("slow down", { status: 429, headers: { "retry-after": "0.01" } }),
      )
      .mockResolvedValueOnce(ok("Second try."));
    vi.stubGlobal("fetch", fetchMock);
    const brief = await generateBrief("retry-check", {
      title: "t",
      section: "markets",
    });
    expect(brief?.body).toBe("Second try.");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("ungroundedFigures", () => {
  const input = {
    title: "Oman Crude Oil Price Rises to $92.04 a Barrel",
    dek: "Muscat, November 13 (QNA) - up $1.77 from Thursday's price of $90.27.",
    section: "markets",
    publishedAt: "2026-11-13T14:13:24.000Z",
  };

  it("accepts figures that come from the facts, however formatted", () => {
    const body =
      "On 13 November 2026 the price rose to 92.04 dollars, up 1.77 from 90.27.";
    expect(ungroundedFigures(body, input)).toEqual([]);
  });

  it("flags an invented figure", () => {
    expect(ungroundedFigures("Oman pumps 1,000,000 barrels a day.", input)).toEqual([
      "1000000",
    ]);
  });
});

describe("generateBrief figure check", () => {
  const ok = (content: string) =>
    new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
      status: 200,
    });
  beforeEach(() => {
    __setGroqPacing(0);
    process.env.GROQ_API_KEY = "test-key";
    process.env.GROQ_MODEL = "test-model";
  });
  afterEach(() => {
    delete process.env.GROQ_API_KEY;
    delete process.env.GROQ_MODEL;
    vi.unstubAllGlobals();
  });

  it("rewrites once when a draft invents a figure", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok("Prices rose 7% this year."))
      .mockResolvedValueOnce(ok("Prices rose on Friday."));
    vi.stubGlobal("fetch", fetchMock);
    const brief = await generateBrief("figure-rewrite", {
      title: "Oil rises",
      section: "markets",
    });
    expect(brief?.body).toBe("Prices rose on Friday.");
    const second = JSON.parse(
      (fetchMock.mock.calls[1] as unknown as [string, RequestInit])[1].body as string,
    );
    expect(second.messages.at(-1).content).toContain("not in the facts: 7");
  });

  it("publishes nothing when the rewrite still invents a figure", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok("Up 7%."))
      .mockResolvedValueOnce(ok("Up 8%."));
    vi.stubGlobal("fetch", fetchMock);
    expect(
      await generateBrief("figure-reject", { title: "Oil rises", section: "markets" }),
    ).toBeNull();
  });
});
