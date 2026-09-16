import { expect, test } from "@playwright/test";

/** Five smoke paths (§6 gate). */

test("the Board renders the hero and a computed session recap", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("weighted by");
  await expect(
    page.getByText("Session recap · computed from market data"),
  ).toBeVisible();
});

test("a quote page shows the price header, chart and computed recap", async ({
  page,
}) => {
  await page.goto("/quote/AAPL");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Apple");
  await expect(page.getByText("How it moved")).toBeVisible();
  // The chart range switcher is present.
  await expect(page.getByRole("button", { name: "1Y" })).toBeVisible();
});

test("the wire lists ranked clusters and a cluster page opens", async ({ page }) => {
  await page.goto("/news");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("wire");
  const firstStory = page.locator("ol li a").first();
  await firstStory.click();
  await expect(page.getByText(/Coverage ·/)).toBeVisible();
});

test("the screener filters server-side to Shariah-compliant names", async ({
  page,
}) => {
  await page.goto("/markets/screener?shariah=yes");
  await expect(page.getByRole("cell", { name: "AAPL" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "JPM" })).toHaveCount(0);
});

test("the economy dashboard renders macro series and the calendar", async ({
  page,
}) => {
  await page.goto("/economy");
  await expect(page.getByText("US CPI (YoY)")).toBeVisible();
  await page.goto("/economy/calendar");
  await expect(page.getByText("FOMC rate decision")).toBeVisible();
});
