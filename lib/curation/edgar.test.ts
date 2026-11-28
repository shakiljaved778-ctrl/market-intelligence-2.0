import { describe, expect, it } from "vitest";
import { edgarFilingItem, isFilingFeed, tidyCompanyName } from "./edgar";

describe("SEC EDGAR filing entries", () => {
  it("turns an S-1 index line into a factual headline and dek", () => {
    const item = edgarFilingItem("S-1 - ACME HOLDINGS INC (0001234567) (Filer)");
    expect(item?.headline).toBe(
      "Acme Holdings Inc. files S-1 registration for a US public offering",
    );
    expect(item?.dek).toContain("Form S-1");
    expect(item?.dek).toContain("Securities and Exchange Commission");
  });

  it("handles foreign issuers (F-1) and keeps mixed-case names as filed", () => {
    expect(
      edgarFilingItem("F-1 - Gulf Data Hub Ltd (0002000001) (Filer)")?.headline,
    ).toBe("Gulf Data Hub Ltd files F-1 registration for a US public offering");
  });

  it("skips amendments, other forms, subject entries and unparseable titles", () => {
    expect(
      edgarFilingItem("S-1/A - ACME HOLDINGS INC (0001234567) (Filer)"),
    ).toBeNull();
    expect(edgarFilingItem("10-K - ACME HOLDINGS INC (0001234567) (Filer)")).toBeNull();
    expect(
      edgarFilingItem("S-1 - ACME HOLDINGS INC (0001234567) (Subject)"),
    ).toBeNull();
    expect(edgarFilingItem("Acme files for IPO")).toBeNull();
  });

  it("tidies upper-case company names and state suffixes", () => {
    expect(tidyCompanyName("BLUE OCEAN ACQUISITION CORP /DE/")).toBe(
      "Blue Ocean Acquisition Corp.",
    );
    expect(tidyCompanyName("XYZ BIO INC")).toBe("XYZ Bio Inc.");
  });

  it("knows which feeds carry one company per entry", () => {
    expect(isFilingFeed("sec-edgar-s1")).toBe(true);
    expect(isFilingFeed("sec-press")).toBe(false);
  });
});
