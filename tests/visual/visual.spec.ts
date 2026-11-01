import { test, expect, type Page } from "@playwright/test";

/**
 * Visual baseline (Prompt Pack Phase 0). One full-page screenshot per route per
 * theme; the project (mobile/desktop) sets the viewport. The live ticker strip
 * and every tabular figure are masked so real/fixture number changes never
 * trip the diff — this guards LAYOUT, COLOUR and TYPOGRAPHY, not live data.
 *
 * Run `pnpm visual:baseline` once to record, then `pnpm visual:compare` in later
 * phases to prove the design is untouched (fails above 0.5% pixel diff).
 */

// Static routes. The article + quote are added below (quote is a fixed symbol;
// the article slug is discovered from the wire so the first fixture story is used).
const ROUTES: { name: string; path: string }[] = [
  { name: "home", path: "/" },
  { name: "markets", path: "/markets" },
  { name: "news", path: "/news" },
  { name: "sections", path: "/sections" },
  { name: "economy", path: "/economy" },
  { name: "methodology", path: "/methodology" },
  { name: "about", path: "/about" },
  { name: "quote-AAPL", path: "/quote/AAPL" },
];

const THEMES = ["light", "dark"] as const;

/** Elements whose content is live/volatile and must be masked out of the diff. */
function masks(page: Page) {
  return [page.locator(".ticker-tape"), page.locator(".tnum")];
}

async function setTheme(page: Page, theme: string) {
  await page.context().addCookies([
    {
      name: "mi_theme",
      value: theme,
      url: new URL("/", page.url() || "http://localhost:3211").origin,
    },
  ]);
}

for (const theme of THEMES) {
  for (const route of ROUTES) {
    test(`${route.name} · ${theme}`, async ({ page, baseURL }) => {
      await page.goto(baseURL ?? "/");
      await setTheme(page, theme);
      await page.goto(route.path, { waitUntil: "load" });
      await expect(page).toHaveScreenshot(`${route.name}-${theme}.png`, {
        fullPage: true,
        mask: masks(page),
      });
    });
  }

  test(`article · ${theme}`, async ({ page, baseURL }) => {
    await page.goto(baseURL ?? "/");
    await setTheme(page, theme);
    // Discover the first wire story so the baseline uses a real, deterministic
    // fixture article (slug is stable in zero-key fixture mode).
    await page.goto("/news", { waitUntil: "load" });
    const href = await page.locator("ol li a").first().getAttribute("href");
    await page.goto(href ?? "/news", { waitUntil: "load" });
    await expect(page).toHaveScreenshot(`article-${theme}.png`, {
      fullPage: true,
      mask: masks(page),
    });
  });
}
