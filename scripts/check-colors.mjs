#!/usr/bin/env node
/**
 * Guard: components and pages must use design tokens, not hardcoded colours.
 * Flags any #hex colour in app/ and components/ outside a small set of files
 * that legitimately need literals (the token file itself, the edge OG image,
 * the favicon, the pre-CSS error boundary, theme-color metas, and the chart /
 * cover-art which read tokens with defensive fallbacks).
 */
import { execSync } from "node:child_process";

const ALLOW = [
  "app/globals.css",
  "app/api/og/route.tsx",
  "app/icon.svg",
  "app/global-error.tsx", // renders outside the app tree; no CSS/tokens available
  "app/layout.tsx", // theme-color <meta> values must be literal
  "components/chart/PriceChart.tsx", // reads tokens; hex only as empty-var fallback
  "components/news/CoverArt.tsx", // #000 scrim stops over generative art
];

let out = "";
try {
  out = execSync(
    `grep -rnE "#[0-9a-fA-F]{3,8}" components app --include="*.tsx" --include="*.ts" || true`,
    { encoding: "utf8" },
  );
} catch (e) {
  out = e.stdout || "";
}

const bad = out
  .split("\n")
  .filter(Boolean)
  .filter((l) => {
    const code = l.replace(/^[^:]+:\d+:/, "");
    if (/^\s*(\/\/|\*|\/\*|\*\/)/.test(code)) return false; // comment line
    return !ALLOW.some((a) => l.startsWith(a));
  });

if (bad.length) {
  console.error(
    "Hardcoded colours found — use design tokens instead:\n" + bad.join("\n"),
  );
  process.exit(1);
}
console.log("OK: no stray hardcoded colours in components/app.");
