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
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
