/**
 * Burst protection for the assistants. The decision is limitkit's; this file
 * holds Solon's numbers and where the counts live.
 *
 * Counts live in Postgres (`rate_limit_windows`), so a deploy does not hand
 * everyone a fresh allowance and every instance counts against the same one.
 * Without a database, or while it cannot be reached, the same rule is applied
 * from this process's memory: a limit that forgets on restart is still better
 * than none. Authentication is checked by each route.
 */
import { createHmac } from "node:crypto";
import {
  MemoryStore,
  slidingWindow,
  type LimitResult,
  type Store,
  type WindowState,
} from "@bitbaum/limitkit";
import { eq, lt, sql } from "drizzle-orm";
import { db, type Database } from "@/lib/db/client";
import { rateLimitWindows } from "@/lib/db/rate-limit-schema";

export { clientIp, toHeaders } from "@bitbaum/limitkit";

/** Requests one person or address may make per bucket in any ten minutes. */
export const ASSISTANT_LIMITS = {
  chat: 20,
  dictation: 40,
  law: 12,
  mcp: 300,
  stats: 12,
  research: 4,
  translate: 60,
} as const;
export const ASSISTANT_WINDOW_MS = 600_000;
export type AssistantBucket = keyof typeof ASSISTANT_LIMITS;

/**
 * One key's window, held for the length of one decision: `decide` reads it
 * through limitkit's store seam and what it writes back is kept. Nothing else
 * may read or write that key in between.
 */
export type SharedWindows = <T>(key: string, decide: (store: Store) => T) => Promise<T>;

/** How long after a failure the shared store is left alone. */
const RETRY_SHARED_MS = 30_000;

export function createAssistantLimiter(shared?: SharedWindows) {
  const local = new MemoryStore();
  let sharedDownUntil = 0;
  return async function check(
    actorId: string,
    bucket: AssistantBucket,
    now = Date.now(),
  ): Promise<LimitResult> {
    const rule = { limit: ASSISTANT_LIMITS[bucket], windowMs: ASSISTANT_WINDOW_MS };
    const key = keyOf(bucket, actorId);
    if (shared && now >= sharedDownUntil) {
      try {
        return await shared(key, (store) => slidingWindow(rule, store).check(key, now));
      } catch (error) {
        sharedDownUntil = now + RETRY_SHARED_MS;
        console.warn("rate limit: shared store unavailable, counting in memory", error);
      }
    }
    return slidingWindow(rule, local).check(key, now);
  };
}

/**
 * What a window is stored under: a keyed digest, so the table holds no
 * address and no account id. Without a secret the digest is unkeyed.
 */
function keyOf(bucket: AssistantBucket, actorId: string): string {
  const secret = process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET || "";
  return createHmac("sha256", secret).update(`${bucket}:${actorId}`).digest("hex");
}

/**
 * Windows in Postgres. One transaction per decision, serialized per key by an
 * advisory lock (a row lock cannot hold a key that has no row yet). Windows
 * nobody came back to are swept once they are older than any rule's horizon.
 */
export function postgresWindows(
  database: Database,
  horizonMs = ASSISTANT_WINDOW_MS,
): SharedWindows {
  let sweptAt = 0;
  return async (key, decide) => {
    const value = await database.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${key}, 0))`);
      const [row] = await tx
        .select({ hits: rateLimitWindows.hits })
        .from(rateLimitWindows)
        .where(eq(rateLimitWindows.key, key));
      let next: WindowState | undefined;
      const result = decide({
        get: () => row && { hits: row.hits },
        set: (_key, state) => {
          next = state;
        },
      });
      // limitkit writes back what is still inside the window plus this request
      // when it is allowed, so a refusal leaves the stored window as it was.
      const hits = (next as WindowState | undefined)?.hits;
      if (hits?.length)
        await tx
          .insert(rateLimitWindows)
          .values({ key, hits })
          .onConflictDoUpdate({
            target: rateLimitWindows.key,
            set: { hits, touchedAt: sql`now()` },
          });
      return result;
    });
    const now = Date.now();
    if (now - sweptAt >= 60_000) {
      sweptAt = now;
      await database
        .delete(rateLimitWindows)
        .where(lt(rateLimitWindows.touchedAt, new Date(now - horizonMs)))
        .catch(() => undefined);
    }
    return value;
  };
}

const limiter = createAssistantLimiter(process.env.DATABASE_URL ? postgresWindows(db) : undefined);

/** May this person or address make another request in this bucket? Counts it when allowed. */
export const checkAssistantRequest = limiter;
