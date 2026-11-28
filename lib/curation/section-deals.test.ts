import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { classify } from "./classify";
import { __resetSectionCache, classifySection, visibleSections } from "./section";

const place = (title: string, sourceId: string | null = null) => {
  const c = classify(title, null);
  return classifySection({ title, topics: c.topics, tickers: c.tickers, sourceId });
};

describe("Deals sections (behind NEXT_PUBLIC_FLAG_DEALS)", () => {
  const before = process.env.NEXT_PUBLIC_FLAG_DEALS;
  afterEach(() => {
    if (before === undefined) delete process.env.NEXT_PUBLIC_FLAG_DEALS;
    else process.env.NEXT_PUBLIC_FLAG_DEALS = before;
    __resetSectionCache();
  });

  describe("on by default (owner, 2026-11-28)", () => {
    beforeEach(() => {
      delete process.env.NEXT_PUBLIC_FLAG_DEALS;
      __resetSectionCache();
    });
    it("the deal sections exist when the variable is not set", () => {
      const ids = visibleSections().map((s) => s.id);
      expect(ids).toEqual(
        expect.arrayContaining(["privateequity", "ibanking", "venture"]),
      );
    });
  });

  describe("flag off", () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_FLAG_DEALS = "0";
      __resetSectionCache();
    });
    it("the deal sections do not exist", () => {
      const ids = visibleSections().map((s) => s.id);
      expect(ids).not.toContain("privateequity");
      expect(ids).not.toContain("ibanking");
      expect(ids).not.toContain("venture");
      expect(
        place("QIIB Successfully Issues $500 Million Senior Unsecured Sukuk"),
      ).not.toBe("ibanking");
    });
  });

  describe("flag on", () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_FLAG_DEALS = "1";
      __resetSectionCache();
    });
    it("files sukuk and bond issues under Investment Banking", () => {
      expect(
        place("QIIB Successfully Issues $500 Million Senior Unsecured Sukuk"),
      ).toBe("ibanking");
      expect(
        place("Ahlibank Completes New Bonds Issuance of USD 500 Million for 5 Years"),
      ).toBe("ibanking");
    });
    it("files buyouts and sovereign-fund deals under Private Equity", () => {
      expect(place("KKR agrees $2bn buyout of European software group")).toBe(
        "privateequity",
      );
    });
    it("files startup rounds under Venture Capital", () => {
      expect(place("Saudi fintech startup raises $30m in Series A round")).toBe(
        "venture",
      );
    });
    it("real sources limited to Markets/Economy can file deals (2026-11-28 bug)", () => {
      // Every live financial source lists its sections; none listed the deal
      // sections, so in production all three stayed empty.
      expect(
        place(
          "QIIB Successfully Issues $500 Million Senior Unsecured Sukuk",
          "qna-economy-local",
        ),
      ).toBe("ibanking");
      expect(
        place(
          "KKR agrees $2bn buyout of European software group",
          "conversation-us-business",
        ),
      ).toBe("privateequity");
      expect(
        place(
          "Saudi fintech startup raises $30m in Series A round",
          "qna-economy-international",
        ),
      ).toBe("venture");
    });
    it("a source not allowed in Markets still cannot file deals", () => {
      expect(
        place("KKR agrees $2bn buyout of European software group", "nasa-news"),
      ).not.toBe("privateequity");
    });
    it("leaves ordinary market news in Markets", () => {
      expect(place("Nvidia shares jump 8% after record quarterly revenue")).toBe(
        "markets",
      );
    });
  });
});

describe("SEC EDGAR filings land in the IPO tracker (2026-11-28)", () => {
  it("files an S-1 under Investment Banking with the ipo topic", async () => {
    const { edgarFilingItem } = await import("./edgar");
    const { headline, dek } = edgarFilingItem(
      "S-1 - ACME HOLDINGS INC (0001234567) (Filer)",
    )!;
    const c = classify(headline, dek);
    expect(c.topics).toContain("ipo");
    expect(
      classifySection({
        title: headline,
        dek,
        topics: c.topics,
        tickers: c.tickers,
        sourceId: "sec-edgar-registrations",
      }),
    ).toBe("ibanking");
  });
});
