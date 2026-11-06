import { defineConfig, devices } from "@playwright/test";

/**
 * Visual-regression config (Prompt Pack Phase 0). Separate from the smoke config
 * so `pnpm test:e2e` stays fast and the baselines live under tests/visual-baseline/.
 *
 * Captures full-page screenshots of the key routes at mobile (390px) and desktop
 * (1440px), in light and dark theme, with the live ticker and all figures masked
 * so real/fixture data never causes a false diff. Uses Playwright's built-in
 * snapshot diffing (no pixelmatch/pngjs dependency to add).
 *
 *   pnpm visual:baseline   # capture / update baselines (run once, reviewed)
 *   pnpm visual:compare    # fail if any unmasked pixel diff exceeds 0.5%
 *
 * Requires a production build first: `pnpm build` (the webServer boots `pnpm start`).
 */
const PORT = 3211;

export default defineConfig({
  testDir: "./tests/visual",
  snapshotPathTemplate: "tests/visual-baseline/{projectName}/{arg}{ext}",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: "line",
  timeout: 90_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "off",
  },
  // 0.5% per-image threshold (the whole-image fraction of differing pixels).
  // A generous assertion timeout so the tall full-page wire capture (which is
  // taken twice to confirm visual stability) doesn't time out.
  expect: {
    timeout: 30_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.005, animations: "disabled" },
  },
  projects: [
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        launchOptions: { executablePath: "/opt/pw-browsers/chromium" },
      },
    },
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        launchOptions: { executablePath: "/opt/pw-browsers/chromium" },
      },
    },
  ],
  webServer: {
    command: `pnpm start -p ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
