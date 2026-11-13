#!/usr/bin/env node
/**
 * Guard: fixture data must not be reachable from production code.
 *
 * `fixtures/` holds committed SAMPLE data (prices, stories, macro series). It is
 * for demo mode, tests and scripts only. Production code may reach it through
 * exactly these gateways, each of which returns nothing unless DEMO_MODE=1 or
 * serves authored (real, cited) content:
 *
 *   lib/demo/**              — demo gateway, gated on isDemoMode()
 *   lib/content/authored.ts  — the authored Eureka explainers
 *   lib/providers/fixture.ts — demo-only provider (added to the registry only
 *                              under DEMO_MODE)
 *
 * Any other runtime import of `@/fixtures/...` fails this check (and CI).
 * `import type` is allowed: it is erased at compile time.
 *
 * Usage: node scripts/check-fixture-imports.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["app", "components", "lib", "jobs", "content"];
const SCAN_FILES = ["middleware.ts"];
const EXTENSIONS = [".ts", ".tsx", ".mts", ".mjs"];

const ALLOWED_PREFIXES = ["lib/demo/"];
const ALLOWED_FILES = new Set(["lib/content/authored.ts", "lib/providers/fixture.ts"]);

function isTest(path) {
  return /\.test\.tsx?$/.test(path) || /\.spec\.tsx?$/.test(path);
}

function isAllowed(path) {
  if (isTest(path)) return true;
  if (ALLOWED_FILES.has(path)) return true;
  return ALLOWED_PREFIXES.some((p) => path.startsWith(p));
}

function walk(dir, out) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (EXTENSIONS.some((e) => name.endsWith(e))) out.push(full);
  }
}

const files = [];
for (const d of SCAN_DIRS) walk(join(ROOT, d), files);
for (const f of SCAN_FILES) files.push(join(ROOT, f));

// A runtime import/export/require/dynamic-import that names the fixtures folder.
const IMPORT_RE =
  /(?:^|\n)\s*(import|export)\s+(?!type\b)[^;]*?from\s+["']([^"']*fixtures\/[^"']*)["']|(?:require|import)\(\s*["']([^"']*fixtures\/[^"']*)["']\s*\)/g;

const violations = [];
for (const file of files) {
  const rel = relative(ROOT, file).split(sep).join("/");
  if (isAllowed(rel)) continue;
  let source;
  try {
    source = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  if (!source.includes("fixtures/")) continue;
  for (const match of source.matchAll(IMPORT_RE)) {
    const spec = match[2] ?? match[3];
    if (!spec) continue;
    if (!spec.startsWith("@/fixtures/") && !/(^|\/)fixtures\//.test(spec)) continue;
    const at = match.index + Math.max(0, match[0].search(/\S/));
    const line = source.slice(0, at).split("\n").length;
    violations.push(`${rel}:${line}  imports "${spec}"`);
  }
}

if (violations.length > 0) {
  console.error("Fixture data is imported by production code:\n");
  for (const v of violations) console.error(`  ${v}`);
  console.error(
    "\nRead sample data through lib/demo/fixtures.ts (returns nothing unless DEMO_MODE=1),",
  );
  console.error(
    "or move real reference data into content/. See scripts/check-fixture-imports.mjs.",
  );
  process.exit(1);
}
console.log(`check-fixture-imports: OK (${files.length} files scanned)`);
