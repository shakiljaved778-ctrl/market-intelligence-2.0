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
    expect(isFilingFeed("sec-edgar-registrations")).toBe(true);
    expect(isFilingFeed("sec-press")).toBe(false);
  });
});

describe("EDGAR daily form index (robots-allowed route)", () => {
  const pad = (s: string, n: number) => s.padEnd(n, " ");
  const row = (
    form: string,
    company: string,
    cik: string,
    date: string,
    file: string,
  ) => `${pad(form, 12)}${pad(company, 62)}${pad(cik, 12)}${pad(date, 12)}${file}`;
  const INDEX = [
    "Description:           Daily Index of EDGAR Dissemination Feed by Form Type",
    "Last Data Received:    November 25, 2026",
    "",
    "Form Type   Company Name                                                  CIK         Date Filed  File Name",
    "-".repeat(140),
    row(
      "10-Q",
      "SOME CO",
      "1111111",
      "20261125",
      "edgar/data/1111111/0001111111-26-000001.txt",
    ),
    row(
      "S-1",
      "ACME HOLDINGS INC",
      "1234567",
      "20261125",
      "edgar/data/1234567/0001234567-26-000012.txt",
    ),
    row(
      "S-1/A",
      "ACME HOLDINGS INC",
      "1234567",
      "20261125",
      "edgar/data/1234567/0001234567-26-000013.txt",
    ),
    row(
      "F-1",
      "Gulf Data Hub Ltd",
      "2000001",
      "20261125",
      "edgar/data/2000001/0002000001-26-000002.txt",
    ),
  ].join("\n");

  it("keeps new S-1 and F-1 registrations only, linked to their filing index", async () => {
    const { parseDailyIndex } = await import("./edgar");
    const out = parseDailyIndex(INDEX);
    expect(out.map((f) => f.headline)).toEqual([
      "Acme Holdings Inc. files S-1 registration for a US public offering",
      "Gulf Data Hub Ltd files F-1 registration for a US public offering",
    ]);
    expect(out[0]?.url).toBe(
      "https://www.sec.gov/Archives/edgar/data/1234567/000123456726000012/0001234567-26-000012-index.htm",
    );
    expect(out[0]?.publishedAt).toBe("2026-11-25T17:00:00Z");
  });

  it("builds the index URL for the right quarter", async () => {
    const { dailyIndexUrl } = await import("./edgar");
    expect(dailyIndexUrl(new Date("2026-11-25T10:00:00Z"))).toBe(
      "https://www.sec.gov/Archives/edgar/daily-index/2026/QTR4/form.20261125.idx",
    );
    expect(dailyIndexUrl(new Date("2027-02-03T10:00:00Z"))).toBe(
      "https://www.sec.gov/Archives/edgar/daily-index/2027/QTR1/form.20270203.idx",
    );
  });
});
