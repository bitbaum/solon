/**
 * The assistants' rate limit against a real database: the counts are in
 * `rate_limit_windows`, so requests racing through separate connections share
 * one allowance, a process started later still sees it, a refusal writes
 * nothing, a flood from one caller neither takes the app's connections nor
 * earns a fresh allowance, and windows nobody came back to are swept by the
 * database's clock.
 *
 * Runs only with INTEGRATION=1 against a migrated database. Plain `pnpm test`
 * skips it.
 */
import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { count, eq, inArray, sql } from "drizzle-orm";
import { Pool } from "pg";
import { db } from "@/lib/db/client";
import { rateLimitWindows } from "@/lib/db/rate-limit-schema";
import { ASSISTANT_LIMITS, createAssistantLimiter, postgresWindows } from "../rate-limit";

const RUN = process.env.INTEGRATION === "1";
const pools: Pool[] = [];
/** One instance: its own pool, as each process has, and a deadline CI can meet. */
function instance(onKey?: (key: string) => void) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
  pools.push(pool);
  const windows = postgresWindows(pool);
  return createAssistantLimiter(
    (key, decide) => {
      onKey?.(key);
      return windows(key, decide);
    },
    { deadlineMs: 15_000, secret: "integration" },
  );
}
afterAll(async () => {
  await Promise.all(pools.map((p) => p.end()));
});

describe.skipIf(!RUN)("rate limit windows in Postgres", () => {
  it("gives racing requests one allowance, whichever instance they reach", async () => {
    const actor = randomUUID();
    const instances = [0, 1, 2].map(() => instance());
    const now = Date.now();
    const results = await Promise.all(
      Array.from({ length: 36 }, (_, i) => instances[i % 3](actor, "law", now + i)),
    );
    expect(results.filter((r) => r.allowed)).toHaveLength(ASSISTANT_LIMITS.law);

    // A process started after the window filled: nothing in memory, same answer.
    const restarted = instance();
    const refused = await restarted(actor, "law", now + 100);
    expect(refused.allowed).toBe(false);
    expect(refused.retryAfterSeconds).toBeGreaterThan(590);
    expect((await restarted(randomUUID(), "law", now + 100)).allowed).toBe(true);
  });

  it("holds digests, and a refusal writes nothing", async () => {
    const actor = `203.0.113.${Math.floor(Math.random() * 250)}-${randomUUID()}`;
    const keys: string[] = [];
    const check = instance((key) => keys.push(key));
    const now = Date.now();
    expect((await check(actor, "research", now)).allowed).toBe(true);
    const [row] = await db.select().from(rateLimitWindows).where(eq(rateLimitWindows.key, keys[0]));
    expect(row.hits).toEqual([now]);
    expect(row.key).toMatch(/^[0-9a-f]{64}$/);
    expect(row.key).not.toContain("203.0.113");

    for (let i = 1; i < ASSISTANT_LIMITS.research; i++) await check(actor, "research", now + i);
    const [full] = await db
      .select()
      .from(rateLimitWindows)
      .where(eq(rateLimitWindows.key, keys[0]));
    expect(full.hits).toHaveLength(ASSISTANT_LIMITS.research);

    // A fresh process, so the refusal is decided by the database, not remembered.
    const other = instance((key) => keys.push(key));
    expect((await other(actor, "research", now + 50)).allowed).toBe(false);
    const [after] = await db
      .select()
      .from(rateLimitWindows)
      .where(eq(rateLimitWindows.key, keys[0]));
    expect(after.hits).toEqual(full.hits);
    expect(after.touchedAt.getTime()).toBe(full.touchedAt.getTime());
  });

  it("sweeps windows nobody came back to, by the database's clock", async () => {
    const stale = [randomUUID(), randomUUID()];
    const fresh = randomUUID();
    await db
      .insert(rateLimitWindows)
      .values([
        ...stale.map((key) => ({ key, hits: [1], touchedAt: sql`now() - interval '11 minutes'` })),
        { key: fresh, hits: [Date.now()], touchedAt: sql`now() - interval '9 minutes'` },
      ]);
    // A new instance sweeps after its first decision, without making it wait.
    await instance()(randomUUID(), "mcp");
    let left = stale.length;
    for (let i = 0; i < 50 && left > 0; i++) {
      await new Promise((r) => setTimeout(r, 100));
      [{ left }] = await db
        .select({ left: count() })
        .from(rateLimitWindows)
        .where(inArray(rateLimitWindows.key, stale));
    }
    expect(left).toBe(0);
    const kept = await db.select().from(rateLimitWindows).where(eq(rateLimitWindows.key, fresh));
    expect(kept).toHaveLength(1);
  });

  it("answers a flood from one caller without the app's pool and without new allowance", async () => {
    const app = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
    pools.push(app);
    const limiterPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 3,
      connectionTimeoutMillis: 1_000,
    });
    pools.push(limiterPool);
    const check = createAssistantLimiter(postgresWindows(limiterPool), { secret: "integration" });
    const actor = randomUUID();
    const now = Date.now();
    for (let i = 0; i < ASSISTANT_LIMITS.mcp; i++) await check(actor, "mcp", now + i);

    const flood = Array.from({ length: 3000 }, () => check(actor, "mcp", now + 1_000));
    const begun = performance.now();
    await app.query("select 1");
    const waited = performance.now() - begun;
    const results = await Promise.all(flood);
    expect(results.filter((r) => r.allowed)).toHaveLength(0);
    expect(waited).toBeLessThan(500);
  });
});
