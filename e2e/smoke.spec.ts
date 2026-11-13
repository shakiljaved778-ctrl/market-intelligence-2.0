import { expect, test } from "@playwright/test";

/**
 * Smoke tests for the critical paths. The server runs in DEMO MODE
 * (playwright.config.ts) so every surface is populated with the committed
 * sample data — which must always be labelled as such.
 */

test("demo mode is announced, and the home page leads with a story", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("note")).toContainText("Demo mode");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // The "Movers" heading used to be rendered twice.
  await expect(page.getByRole("heading", { name: "Movers", exact: true })).toHaveCount(
    1,
  );
  // The date banner is today's date in Doha, not the newest story's date.
  const today = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Qatar",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
  await expect(page.getByText(`Today on Mizaan`)).toContainText(today);
});

test("a stock page shows the price with its stamp, the chart and the computed recap", async ({
  page,
}) => {
  await page.goto("/quote/AAPL");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Apple");
  await expect(page.getByText("Demo data — not market data").first()).toBeVisible();
  await expect(page.getByText("How it moved")).toBeVisible();
  await expect(page.getByRole("button", { name: "1Y" })).toBeVisible();
});

test("an unknown symbol is a 404, not an invented price", async ({ page }) => {
  const res = await page.goto("/quote/NOPE");
  expect(res?.status()).toBe(404);
});

test("the wire lists ranked stories and a story page opens", async ({ page }) => {
  await page.goto("/news");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("wire");
  const first = page.locator("ol li a").first();
  await expect(first).toBeVisible();
  await first.click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("the screener sorts and paginates on the server", async ({ page }) => {
  await page.goto("/markets/screener?sort=symbol&dir=asc");
  const symbols = page.locator("tbody tr td:first-child a span:first-child");
  const firstPage = await symbols.allTextContents();
  expect(firstPage.length).toBe(25);
  expect(firstPage).toEqual([...firstPage].sort((a, b) => a.localeCompare(b)));
  await expect(page.getByRole("columnheader", { name: /Symbol/ })).toHaveAttribute(
    "aria-sort",
    "ascending",
  );

  // No Shariah column until a documented, rule-based screen exists.
  await expect(page.getByRole("columnheader", { name: /Shariah/ })).toHaveCount(0);

  await page.getByRole("link", { name: /Next/ }).click();
  await expect(page).toHaveURL(/page=2/);
  const secondPage = await symbols.allTextContents();
  expect(secondPage[0]).not.toBe(firstPage[0]);
  // The old ?shariah= parameter still resolves (it is simply ignored).
  const res = await page.goto("/markets/screener?shariah=yes");
  expect(res?.status()).toBe(200);
});

test("markets shows session hours in Doha time and every asset tab's content", async ({
  page,
}) => {
  await page.goto("/markets");
  await expect(page.getByText("Doha time").first()).toBeVisible();
  await expect(page.getByText("Qatar · QSE")).toBeVisible();
  // All three panels exist in the HTML; tabs only switch which one is visible.
  await expect(page.locator("#asset-panel-fx li").first()).toBeVisible();
  await expect(page.locator("#asset-panel-commodities li")).not.toHaveCount(0);
  await page.getByRole("tab", { name: "Commodities" }).click();
  await expect(page.locator("#asset-panel-commodities li").first()).toBeVisible();
  // The heatmap is server-rendered: tiles are links in the HTML.
  await expect(page.locator('section[aria-label$="sector"] a').first()).toBeVisible();
});

test("the economy dashboard renders series and the calendar", async ({ page }) => {
  await page.goto("/economy");
  await expect(page.getByText("US CPI (YoY)")).toBeVisible();
  await page.goto("/economy/calendar");
  await expect(page.getByText("FOMC rate decision")).toBeVisible();
});

test("the footer newsletter form is one visible field and one button", async ({
  page,
}) => {
  await page.goto("/about");
  const field = page.locator("#nl-footer-email");
  await expect(field).toBeVisible();
  await expect(page.locator("footer input[type=checkbox]")).toHaveCount(0);
  await expect(
    page.locator("footer").getByRole("button", { name: "Subscribe" }),
  ).toBeVisible();
  // The colour-blind control carries a visible text label.
  await expect(page.getByRole("switch")).toContainText("Colour-blind-safe colours");
});

test("no page scrolls sideways on a 380px phone", async ({ page }) => {
  await page.setViewportSize({ width: 380, height: 800 });
  for (const path of [
    "/",
    "/markets",
    "/markets/screener",
    "/economy",
    "/quote/AAPL",
  ]) {
    await page.goto(path);
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width, path).toBeLessThanOrEqual(380);
  }
});
