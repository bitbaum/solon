import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["src/**/__tests__/**/*.test.ts"],
    environment: "node",
    // next-intl's ESM imports `next/navigation` without an extension, which
    // Node cannot resolve on its own; Vite can, when it bundles next-intl.
    server: { deps: { inline: ["next-intl"] } },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
