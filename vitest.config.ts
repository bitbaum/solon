import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["src/**/__tests__/**/*.test.ts"],
    environment: "node",
    // next-intl's ESM imports `next/navigation` without an extension, which
    // Node cannot resolve on its own; Vite can, when it bundles next-intl.
    server: { deps: { inline: ["next-intl"] } },
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "json-summary", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.d.ts", "src/**/__tests__/**"],
      // A ratchet floor, set just below what the suite measures today, so
      // coverage can only go up. Raise it when tests are added; never lower it
      // to make a failing build pass.
      thresholds: {
        // Measured 2026-11-12: statements 46.8, branches 37.6, functions 42.7, lines 46.8.
        statements: 46,
        branches: 37,
        functions: 42,
        lines: 46,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
