// Flat config, required by ESLint 9+. Replaces `.eslintrc.json`.
//
// `next lint` no longer exists — Next 16 removed it, and the old script failed
// with "no such directory: ./lint" because the CLI read the word as a path.
// ESLint runs directly now, and `eslint-config-next/core-web-vitals` already
// exports a flat config array, so there is nothing to translate.
import coreWebVitals from "eslint-config-next/core-web-vitals";

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  ...coreWebVitals,
];

export default config;
