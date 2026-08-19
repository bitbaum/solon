// Flat config, required by ESLint 9+. Replaces `.eslintrc.json`.
//
// `next lint` no longer exists — Next 16 removed it, and the old script failed
// with "no such directory: ./lint" because the CLI read the word as a path.
// ESLint runs directly now, and `eslint-config-next/core-web-vitals` already
// exports a flat config array, so there is nothing to translate.
import * as espree from "espree";
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
  {
    // ESLint 10 removed the legacy `context.getFilename()` API that
    // eslint-plugin-react's version-`detect` codepath still calls, and
    // dropped the implicit `scopeManager.addGlobals` that Next's bundled
    // babel-eslint-parser relied on for plain JS. Pin an explicit React
    // version so `detect` never runs, and use the plain espree parser for
    // non-TS files (none of which need Babel/JSX-only syntax here).
    settings: { react: { version: "19.2.8" } },
  },
  {
    files: ["**/*.js", "**/*.mjs"],
    languageOptions: { parser: espree },
  },
];

export default config;
