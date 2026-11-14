import { describe, expect, it } from "vitest";
import { pageOf } from "./paginate";

const items = Array.from({ length: 65 }, (_, i) => i + 1);

describe("pageOf", () => {
  it("serves the first page by default", () => {
    const p = pageOf(items, undefined, 30);
    expect(p).toMatchObject({ page: 1, pages: 3, total: 65 });
    expect(p.items[0]).toBe(1);
    expect(p.items).toHaveLength(30);
  });

  it("serves a later page and a short last page", () => {
    expect(pageOf(items, "2", 30).items[0]).toBe(31);
    expect(pageOf(items, "3", 30).items).toEqual([61, 62, 63, 64, 65]);
  });

  it("clamps nonsense and out-of-range pages", () => {
    expect(pageOf(items, "0", 30).page).toBe(1);
    expect(pageOf(items, "-4", 30).page).toBe(1);
    expect(pageOf(items, "abc", 30).page).toBe(1);
    expect(pageOf(items, "99", 30).page).toBe(3);
  });

  it("has one empty page for an empty list", () => {
    expect(pageOf([], "5", 30)).toEqual({ items: [], page: 1, pages: 1, total: 0 });
  });
});
