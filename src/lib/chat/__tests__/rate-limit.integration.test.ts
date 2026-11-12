/**
 * The assistants' rate limit against a real database: the counts are in
 * `rate_limit_windows`, so requests racing through separate connections share
 * one allowance, a process started later still sees it, and windows nobody
 * came back to are swept.
 *
 * Runs only with INTEGRATION=1 against a migrated database. Plain `pnpm test`
 * skips it.
 */
import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { count, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { rateLimitWindows } from "@/lib/db/rate-limit-schema";
import { ASSISTANT_LIMITS, createAssistantLimiter, postgresWindows } from "../rate-limit";

const RUN = process.env.INTEGRATION === "1";

describe.skipIf(!RUN)("rate limit windows in Postgres", () => {
  it("gives racing requests one allowance, whichever instance they reach", async () => {
    const actor = randomUUID();
    const instances = [0, 1, 2].map(() => createAssistantLimiter(postgresWindows(db)));
    const now = Date.now();
    const results = await Promise.all(
      Array.from({ length: 36 }, (_, i) => instances[i % 3](actor, "law", now + i)),
    );
    expect(results.filter((r) => r.allowed)).toHaveLength(ASSISTANT_LIMITS.law);

    // A process started after the window filled: nothing in memory, same answer.
    const restarted = createAssistantLimiter(postgresWindows(db));
    const refused = await restarted(actor, "law", now + 100);
    expect(refused.allowed).toBe(false);
    expect(refused.retryAfterSeconds).toBeGreaterThan(590);
    expect((await restarted(randomUUID(), "law", now + 100)).allowed).toBe(true);
  });

  it("holds digests, and a refusal adds nothing to the window", async () => {
    const actor = `203.0.113.${Math.floor(Math.random() * 250)}-${randomUUID()}`;
    const keys: string[] = [];
    const windows = postgresWindows(db);
    const check = createAssistantLimiter((key, decide) => {
      keys.push(key);
      return windows(key, decide);
    });
    const now = Date.now();
    expect((await check(actor, "research", now)).allowed).toBe(true);
    const [row] = await db.select().from(rateLimitWindows).where(eq(rateLimitWindows.key, keys[0]));
    expect(row.hits).toEqual([now]);
    expect(row.key).toMatch(/^[0-9a-f]{64}$/);
    expect(row.key).not.toContain("203.0.113");

    for (let i = 0; i < 3; i++) await check(actor, "research", now);
    expect((await check(actor, "research", now)).allowed).toBe(false);
    const [held] = await db
      .select()
      .from(rateLimitWindows)
      .where(eq(rateLimitWindows.key, keys[0]));
    expect(held.hits).toHaveLength(ASSISTANT_LIMITS.research);
  });

  it("sweeps windows nobody came back to", async () => {
    const stale = [randomUUID(), randomUUID()];
    const fresh = randomUUID();
    await db
      .insert(rateLimitWindows)
      .values([
        ...stale.map((key) => ({ key, hits: [1], touchedAt: sql`now() - interval '11 minutes'` })),
        { key: fresh, hits: [Date.now()] },
      ]);
    // A new store sweeps on its first decision.
    await createAssistantLimiter(postgresWindows(db))(randomUUID(), "mcp");
    const [{ left }] = await db
      .select({ left: count() })
      .from(rateLimitWindows)
      .where(inArray(rateLimitWindows.key, stale));
    expect(left).toBe(0);
    const kept = await db.select().from(rateLimitWindows).where(eq(rateLimitWindows.key, fresh));
    expect(kept).toHaveLength(1);
  });
});
