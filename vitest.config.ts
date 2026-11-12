import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["src/**/__tests__/**/*.test.ts"],
    environment: "node",
    // next-intl's ESM imports `next/navigation` without an extension, which
    // Node cannot resolve on its own; Vite can, when it bundles next-intl.
    server: { deps: { inline: ["next-intl"] } },
    // Measured by `pnpm run test:coverage`, which is what `verify` runs. Every
    // source file counts, tested or not, so the figure is of the codebase and
    // not of the files that happen to have a test. The thresholds are a floor
    // set just under what was measured on 2026-11-12 (statements 46.8,
    // branches 37.6, functions 42.7, lines 46.8): they stop coverage falling
    // unnoticed. Raise them as tests are added; never lower them to go green.
    // Specs that need a database (`*.integration.test.ts`) run in CI's
    // `integration` job and are not counted here.
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/__tests__/**", "src/**/*.d.ts"],
      reporter: ["text-summary", "json-summary"],
      thresholds: { statements: 46, branches: 37, functions: 42, lines: 46 },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
