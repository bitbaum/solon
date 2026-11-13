/**
 * Burst protection for the assistants. The decision is limitkit's; this file
 * holds Solon's numbers and where the counts live.
 *
 * Counts live in Postgres (`rate_limit_windows`), so a deploy does not hand
 * everyone a fresh allowance and every instance counts against the same one.
 * The limiter has its own small connection pool with short timeouts, so a
 * burst of requests can never queue the app's own queries behind it, and a
 * refusal is remembered in memory until its window opens, so a refused caller
 * who keeps knocking costs no database work at all.
 *
 * Without a database or a session secret, or while the database is slow or
 * unreachable, the same rule is applied from this process's memory: a limit
 * that forgets on restart is still better than none. Authentication is
 * checked by each route.
 */
import { createHmac } from "node:crypto";
import {
  MemoryStore,
  slidingWindow,
  type LimitResult,
  type Store,
  type WindowState,
} from "@bitbaum/limitkit";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, lt, sql } from "drizzle-orm";
import { Pool } from "pg";
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
 * through limitkit's store seam, and the window it writes back is kept when
 * the request is allowed. Nothing else may read or write that key in between.
 */
export type SharedWindows = (
  key: string,
  decide: (store: Store) => LimitResult,
) => Promise<LimitResult>;

/** How long after a failure the shared store is left alone. */
const RETRY_SHARED_MS = 30_000;
/** How long one decision may wait on the shared store before memory decides. */
const SHARED_DEADLINE_MS = 1_500;
/** Refusals remembered per process; past this the oldest is forgotten. */
const MAX_REMEMBERED_REFUSALS = 5_000;

class SharedTimeout extends Error {
  readonly code = "deadline";
}

function within<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new SharedTimeout()), ms);
    timer.unref?.();
  });
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
}

/** A short reason for the log: never the query or its parameters. */
function reasonOf(error: unknown): string {
  const e = error as { code?: unknown; cause?: { code?: unknown }; name?: unknown };
  return String(e?.code ?? e?.cause?.code ?? e?.name ?? "error");
}

export function createAssistantLimiter(
  shared?: SharedWindows,
  options: { deadlineMs?: number; secret?: string } = {},
) {
  const deadlineMs = options.deadlineMs ?? SHARED_DEADLINE_MS;
  const local = new MemoryStore();
  // key -> when its window opens again. Other instances can only add hits to
  // a window, never remove them, so a refusal cannot end earlier than this.
  const refusedUntil = new Map<string, number>();
  let sharedDownUntil = 0;

  function remember(key: string, result: LimitResult) {
    if (result.allowed) return;
    refusedUntil.delete(key);
    refusedUntil.set(key, result.resetAt);
    if (refusedUntil.size > MAX_REMEMBERED_REFUSALS)
      refusedUntil.delete(refusedUntil.keys().next().value as string);
  }

  // One decision at a time per key in this process: concurrent requests from
  // one caller wait for the first answer instead of each taking a connection,
  // and once that answer is a refusal the rest are answered from memory.
  const inFlight = new Map<string, Promise<unknown>>();
  function oneAtATime<T>(key: string, decide: () => Promise<T>): Promise<T> {
    const turn = (inFlight.get(key) ?? Promise.resolve()).then(decide, decide);
    const settled = turn.then(
      () => undefined,
      () => undefined,
    );
    inFlight.set(key, settled);
    void settled.then(() => {
      if (inFlight.get(key) === settled) inFlight.delete(key);
    });
    return turn;
  }

  async function decide(key: string, bucket: AssistantBucket, now: number) {
    const rule = { limit: ASSISTANT_LIMITS[bucket], windowMs: ASSISTANT_WINDOW_MS };
    const until = refusedUntil.get(key);
    if (until !== undefined) {
      if (now < until)
        return {
          allowed: false,
          limit: rule.limit,
          remaining: 0,
          resetAt: until,
          retryAfterSeconds: Math.max(1, Math.ceil((until - now) / 1000)),
        };
      refusedUntil.delete(key);
    }

    if (shared && now >= sharedDownUntil) {
      const started = Date.now();
      try {
        const result = await within(
          shared(key, (store) => slidingWindow(rule, store).check(key, now)),
          deadlineMs,
        );
        // Memory keeps this process's own allowed requests too, so a fallback
        // continues the count instead of handing out a fresh allowance.
        if (result.allowed) slidingWindow(rule, local).check(key, now);
        remember(key, result);
        return result;
      } catch (error) {
        // Measured from when it failed, not from when the request arrived:
        // a failure that took longer than the back-off must still back off.
        sharedDownUntil = now + (Date.now() - started) + RETRY_SHARED_MS;
        console.warn(
          `rate limit: shared store unavailable (${reasonOf(error)}), counting in memory`,
        );
      }
    }
    const result = slidingWindow(rule, local).check(key, now);
    remember(key, result);
    return result;
  }

  return function check(
    actorId: string,
    bucket: AssistantBucket,
    now = Date.now(),
  ): Promise<LimitResult> {
    const key = keyOf(bucket, actorId, options.secret);
    return oneAtATime(key, () => decide(key, bucket, now));
  };
}

/** A keyed digest of bucket and requester: the table never holds an address or an account id. */
function keyOf(bucket: AssistantBucket, actorId: string, secret = sessionSecret()): string {
  return createHmac("sha256", secret ?? "")
    .update(`solon/rate-limit/v1\0${bucket}\0${actorId}`)
    .digest("hex");
}

function sessionSecret(): string | undefined {
  return process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET || undefined;
}

/**
 * Windows in Postgres, on a pool of their own. One transaction per allowed
 * decision, serialized per key by an advisory lock (a row lock cannot hold a
 * key that has no row yet). A refusal writes nothing. Windows nobody came back
 * to are swept once they are older than any rule's horizon, by the database's
 * own clock, the one that wrote them.
 */
export function postgresWindows(pool: Pool, horizonMs = ASSISTANT_WINDOW_MS): SharedWindows {
  const database = drizzle(pool, { schema: { rateLimitWindows } });
  let sweptAt = 0;
  return async (key, decide) => {
    const result = await database.transaction(async (tx) => {
      await tx.execute(sql`set local lock_timeout = '1000ms'`);
      await tx.execute(sql`set local statement_timeout = '2000ms'`);
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${key}, 0))`);
      const [row] = await tx
        .select({ hits: rateLimitWindows.hits })
        .from(rateLimitWindows)
        .where(eq(rateLimitWindows.key, key));
      let next: WindowState | undefined;
      const decided = decide({
        get: () => row && { hits: row.hits },
        set: (_key, state) => {
          next = state;
        },
      });
      const hits = (next as WindowState | undefined)?.hits;
      if (decided.allowed && hits?.length)
        await tx
          .insert(rateLimitWindows)
          .values({ key, hits })
          .onConflictDoUpdate({
            target: rateLimitWindows.key,
            set: { hits, touchedAt: sql`now()` },
          });
      return decided;
    });
    const now = Date.now();
    if (now - sweptAt >= 60_000) {
      sweptAt = now;
      void database
        .delete(rateLimitWindows)
        .where(lt(rateLimitWindows.touchedAt, sql`now() - ${horizonMs} * interval '1 millisecond'`))
        .catch(() => undefined);
    }
    return result;
  };
}

/**
 * The limiter's own pool: three connections, and a request that cannot get
 * one within a second fails over to memory instead of waiting.
 */
function limiterPool(connectionString: string): Pool {
  const pool = new Pool({
    connectionString,
    max: 3,
    connectionTimeoutMillis: 1_000,
    idleTimeoutMillis: 30_000,
  });
  // An idle client that loses its connection must not take the process down.
  pool.on("error", () => undefined);
  return pool;
}

/**
 * Shared counts need both a database and a secret: without a secret the
 * stored keys would be plain digests of addresses, so nothing is stored.
 */
export function sharedConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.DATABASE_URL && (env.BETTER_AUTH_SECRET || env.AUTH_SECRET));
}

/** May this person or address make another request in this bucket? Counts it when allowed. */
export const checkAssistantRequest = createAssistantLimiter(
  sharedConfigured() ? postgresWindows(limiterPool(process.env.DATABASE_URL as string)) : undefined,
);
