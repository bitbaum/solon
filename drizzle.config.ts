/**
 * Drizzle Kit config. Schema lives in src/lib/db/schema.ts; generated SQL in
 * ./drizzle (the deploy pipeline's apply-schema.sh probes exactly that path).
 *
 * dbCredentials are only needed by db:migrate / db:push / studio — `db:generate`
 * is offline. Env files are loaded with Node's own loader (no dotenv dep).
 */
import { defineConfig } from "drizzle-kit";

for (const f of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(f);
  } catch {
    // file absent (CI) — DATABASE_URL comes from the environment
  }
}

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://unset:unset@localhost:5432/unset",
  },
});
