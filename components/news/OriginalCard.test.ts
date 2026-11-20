import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OriginalCard } from "./OriginalCard";

describe("OriginalCard", () => {
  it("labels the piece as ours and AI-written, and links to its page", () => {
    const html = renderToStaticMarkup(
      createElement(OriginalCard, {
        original: {
          slug: "global-markets-2026-11-20-06",
          kind: "global-markets",
          title: "Rate bets lift equities as yields ease",
          dek: "Stocks rose while bond yields fell, according to the reports.",
          bodyMd: "Body",
          sources: [
            { title: "A", source: "Fed", url: "https://example.com/a", slug: "a" },
            { title: "B", source: "ECB", url: "https://example.com/b", slug: "b" },
          ],
          model: "test",
          coverUrl: null,
          coverCredit: null,
          coverCreditUrl: null,
          publishedAt: new Date().toISOString(),
        },
      }),
    );
    expect(html).toContain('href="/analysis/global-markets-2026-11-20-06"');
    expect(html).toContain("Mizaan Original");
    expect(html).toContain("AI-written from cited reports");
    expect(html).toContain("2 cited reports");
    expect(html).not.toMatch(/exclusive/i);
  });
});
