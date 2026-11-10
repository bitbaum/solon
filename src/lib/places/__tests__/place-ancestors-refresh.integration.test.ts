/**
 * The refresh of `place_ancestors` works for a role that does not own it. On
 * production the importer is not the migrating role, and `REFRESH
 * MATERIALIZED VIEW` is allowed only to the view's owner: every import that
 * changed data failed with "permission denied for materialized view
 * place_ancestors" while CI, whose one role owns everything, stayed green.
 * This test is that other role.
 *
 * Runs only with INTEGRATION=1 against a migrated database, and only where the
 * role it runs as may create roles.
 */
import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";

const RUN = process.env.INTEGRATION === "1";
const role = `probe_${Math.random().toString(36).slice(2, 10)}`;

async function asProbe(statement: ReturnType<typeof sql>): Promise<string | null> {
  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL ROLE ${role}`));
      await tx.execute(statement);
    });
    return null;
  } catch (error) {
    const cause = (error as { cause?: { message?: string } }).cause;
    return cause?.message ?? String(error);
  }
}

describe.skipIf(!RUN)("place_ancestors, refreshed by a role that is not its owner", () => {
  it("is refused a direct refresh and may ask the function for one", async (ctx) => {
    try {
      await db.execute(sql.raw(`CREATE ROLE ${role} NOLOGIN`));
    } catch {
      ctx.skip();
    }
    try {
      await db.execute(sql.raw(`GRANT USAGE ON SCHEMA public TO ${role}`));
      expect(await asProbe(sql`REFRESH MATERIALIZED VIEW place_ancestors`)).toMatch(
        /must be owner|permission denied/,
      );
      expect(await asProbe(sql`SELECT place_ancestors_refresh()`)).toBeNull();
    } finally {
      await db.execute(sql.raw(`DROP OWNED BY ${role}`));
      await db.execute(sql.raw(`DROP ROLE ${role}`));
    }
  });
});
