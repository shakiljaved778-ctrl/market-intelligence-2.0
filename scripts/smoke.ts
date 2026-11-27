/**
 * Smoke test (pre-launch audit, 2026-11-27). Hits every top-level route and
 * section on a deployment and checks, from the HTML as served:
 *   - HTTP 200 (the health endpoint may also answer 503 — that is reported);
 *   - no "undefined", "NaN", "[object Object]" or "Lorem" in the visible text;
 *   - section fronts list at least MIN_STORIES stories;
 *   - market tables have rows or say honestly that data is missing.
 * With --browser it also loads key pages in Chromium and fails on console errors.
 *
 * Usage: pnpm smoke [baseUrl] [--browser]
 *   baseUrl defaults to https://www.mizaan.tech
 */

const args = process.argv.slice(2);
const BASE = (
  args.find((a) => !a.startsWith("--")) ?? "https://www.mizaan.tech"
).replace(/\/$/, "");
const BROWSER = args.includes("--browser");
const MIN_STORIES = 3;

const SECTIONS = [
  "markets",
  "economy",
  "crypto",
  "realestate",
  "technology",
  "health",
  "sports",
  "entertainment",
  "science",
  "world",
  "eureka",
];

const PAGES = [
  "/",
  "/markets",
  "/markets/screener",
  "/markets/qse",
  "/markets/tadawul",
  "/markets/adx",
  "/markets/dfm",
  "/news",
  "/sections",
  "/economy",
  "/videos",
  "/methodology",
  "/ai-disclosure",
  "/editorial-policy",
  "/corrections",
  "/about",
  "/contact",
  "/terms",
  "/privacy",
  "/quote/AAPL",
  "/quote/ANT",
  "/quote/QNBK",
];

const BAD_TEXT: [string, RegExp][] = [
  ["undefined", /\bundefined\b/],
  ["NaN", /\bNaN\b/],
  ["[object Object]", /\[object Object\]/],
  ["Lorem", /\bLorem\b/],
];

interface Result {
  path: string;
  ok: boolean;
  notes: string[];
}

function visibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");
}

async function fetchPage(path: string): Promise<{ status: number; html: string }> {
  // One retry: a single dropped connection is not a site failure.
  for (let attempt = 1; ; attempt += 1) {
    try {
      const res = await fetch(`${BASE}${path}`, {
        headers: { "user-agent": "MizaanSmokeTest/1.0" },
        redirect: "follow",
      });
      return { status: res.status, html: await res.text() };
    } catch (err) {
      if (attempt >= 2) throw err;
    }
  }
}

/** Network errors from the machine running the test, not from the site. */
const LOCAL_NETWORK_ERROR =
  /net::ERR_(TUNNEL_CONNECTION_FAILED|PROXY_|NAME_NOT_RESOLVED)/;

async function checkPage(path: string, minStories = 0): Promise<Result> {
  const notes: string[] = [];
  try {
    const { status, html } = await fetchPage(path);
    if (status !== 200) notes.push(`HTTP ${status}`);
    const text = visibleText(html);
    for (const [label, re] of BAD_TEXT)
      if (re.test(text)) notes.push(`contains "${label}"`);
    if (minStories > 0) {
      const stories = new Set(html.match(/href="\/news\/[a-z0-9-]+"/g) ?? []).size;
      if (stories < minStories) notes.push(`${stories} stories (< ${minStories})`);
    }
    if (path === "/markets") {
      const rows = (html.match(/role="tabpanel"/g) ?? []).length;
      const empty = /No commodity prices are available|not yet|no data/i.test(text);
      if (rows === 0 && !empty)
        notes.push("market tables neither filled nor marked empty");
    }
  } catch (err) {
    notes.push(`request failed: ${(err as Error).message}`);
  }
  return { path, ok: notes.length === 0, notes };
}

async function checkHealth(): Promise<Result> {
  const notes: string[] = [];
  try {
    const res = await fetch(`${BASE}/api/health`, {
      headers: { "cache-control": "no-cache" },
    });
    const body = (await res.json()) as { status?: string };
    if (res.status !== 200) notes.push(`HTTP ${res.status}`);
    if (body.status !== "ok") notes.push(`status "${body.status ?? "missing"}"`);
  } catch (err) {
    notes.push(`request failed: ${(err as Error).message}`);
  }
  return { path: "/api/health", ok: notes.length === 0, notes };
}

async function storyPage(): Promise<string | null> {
  try {
    const { html } = await fetchPage("/news");
    return html.match(/href="(\/news\/[a-z0-9-]+)"/)?.[1] ?? null;
  } catch {
    return null;
  }
}

async function consoleErrors(paths: string[]): Promise<Result[]> {
  // Loaded only with --browser, so CI without a browser can still run the rest.
  const { chromium } = await import("@playwright/test");
  // SMOKE_CHROMIUM points at a preinstalled Chromium when Playwright's own
  // browser download is not available (e.g. a sandbox).
  const executablePath = process.env.SMOKE_CHROMIUM;
  const browser = await chromium.launch(executablePath ? { executablePath } : {});
  const out: Result[] = [];
  for (const path of paths) {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" && !LOCAL_NETWORK_ERROR.test(m.text()))
        errors.push(m.text().slice(0, 140));
    });
    page.on("pageerror", (e) => errors.push(e.message.slice(0, 140)));
    try {
      await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 45_000 });
    } catch (err) {
      errors.push(`load: ${(err as Error).message.slice(0, 100)}`);
    }
    out.push({ path: `${path} (console)`, ok: errors.length === 0, notes: errors });
    await page.close();
  }
  await browser.close();
  return out;
}

async function main(): Promise<void> {
  const story = await storyPage();
  const jobs: Promise<Result>[] = [
    ...PAGES.map((p) => checkPage(p)),
    ...SECTIONS.map((s) => checkPage(`/news?section=${s}`, MIN_STORIES)),
    checkHealth(),
  ];
  if (story) jobs.push(checkPage(story));
  const results = await Promise.all(jobs);
  if (BROWSER)
    results.push(...(await consoleErrors(["/", "/markets", story ?? "/news"])));

  const failed = results.filter((r) => !r.ok);
  for (const r of results) {
    console.log(
      `${r.ok ? "PASS" : "FAIL"}  ${r.path}${r.ok ? "" : `  — ${r.notes.join("; ")}`}`,
    );
  }
  console.log(
    `\n${results.length - failed.length}/${results.length} passed against ${BASE}`,
  );
  process.exitCode = failed.length > 0 ? 1 : 0;
}

void main();
