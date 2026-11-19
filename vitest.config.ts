import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules", ".next"],
    // Unit tests run against the committed fixtures. Tests of production
    // (non-demo) behaviour unset this explicitly with vi.stubEnv.
    env: { DEMO_MODE: "1" },
  },
  // Components use the automatic JSX runtime (as Next does), so a render test
  // needs no React import.
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
