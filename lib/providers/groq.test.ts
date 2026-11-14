import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BRIEF_MIN_WORDS, BRIEF_TARGET_WORDS, generateBrief, wordCount } from "./groq";

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
    expect(system).toContain("must not add any new specific figure");
    expect(system).toContain("never invent prices");
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
