import { describe, expect, it } from "vitest";
import { getTableColumns } from "drizzle-orm";
import { articles } from "./schema";

/**
 * Invariant guard (§10, §17): the articles table must NEVER gain a body column.
 * This test fails loudly if anyone adds one.
 */
describe("articles schema — no body text, ever", () => {
  const columns = Object.keys(getTableColumns(articles));

  it("has the headline/dek metadata columns", () => {
    expect(columns).toContain("headline");
    expect(columns).toContain("dek");
    expect(columns).toContain("url");
  });

  it("has NO body / content / text column", () => {
    for (const forbidden of ["body", "content", "fullText", "articleText", "html"]) {
      expect(columns).not.toContain(forbidden);
    }
  });
});
