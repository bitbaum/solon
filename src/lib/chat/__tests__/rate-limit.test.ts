import { describe, expect, it, vi } from "vitest";
import { MemoryStore } from "@bitbaum/limitkit";
import {
  ASSISTANT_LIMITS,
  ASSISTANT_WINDOW_MS,
  checkAssistantRequest,
  createAssistantLimiter,
  sharedConfigured,
  toHeaders,
  type SharedWindows,
} from "../rate-limit";

/** A shared store two limiters can hold, as two instances hold one database. */
function sharedMemory() {
  const store = new MemoryStore();
  const keys: string[] = [];
  const windows: SharedWindows = async (key, decide) => {
    keys.push(key);
    return decide(store);
  };
  return { windows, keys };
}

const quiet = () => vi.spyOn(console, "warn").mockImplementation(() => undefined);

it("limits bursts per person and operation, then permits another window", async () => {
  const id = crypto.randomUUID();
  const now = Date.now();
  for (let i = 0; i < 20; i++)
    expect((await checkAssistantRequest(id, "chat", now)).allowed).toBe(true);
  expect((await checkAssistantRequest(id, "chat", now)).allowed).toBe(false);
  expect((await checkAssistantRequest(id, "dictation", now)).allowed).toBe(true);
  expect((await checkAssistantRequest(crypto.randomUUID(), "chat", now)).allowed).toBe(true);
  expect((await checkAssistantRequest(id, "chat", now + 600000)).allowed).toBe(true);
});

describe("the assistants' limiter", () => {
  it("holds every bucket to its own number", async () => {
    for (const [bucket, limit] of Object.entries(ASSISTANT_LIMITS)) {
      const check = createAssistantLimiter();
      const now = 1_000_000;
      let allowed = 0;
      for (let i = 0; i < limit + 5; i++)
        if ((await check("someone", bucket as keyof typeof ASSISTANT_LIMITS, now)).allowed)
          allowed++;
      expect(allowed, bucket).toBe(limit);
    }
  });

  it("counts against one allowance from every instance, and across a restart", async () => {
    const { windows } = sharedMemory();
    const first = createAssistantLimiter(windows);
    const second = createAssistantLimiter(windows);
    const now = 1_000_000;
    for (let i = 0; i < 2; i++) expect((await first("a", "research", now)).allowed).toBe(true);
    for (let i = 0; i < 2; i++) expect((await second("a", "research", now)).allowed).toBe(true);
    expect((await first("a", "research", now)).allowed).toBe(false);
    expect((await second("a", "research", now)).allowed).toBe(false);
    // A process started after the window filled knows nothing but the store.
    const restarted = createAssistantLimiter(windows);
    expect((await restarted("a", "research", now + 1)).allowed).toBe(false);
    expect((await restarted("b", "research", now + 1)).allowed).toBe(true);
  });

  it("slides: an allowance returns as each request ages out, not all at once", async () => {
    const check = createAssistantLimiter();
    const start = 1_000_000;
    for (let i = 0; i < 4; i++) await check("a", "research", start + i * 60_000);
    const refused = await check("a", "research", start + 4 * 60_000);
    expect(refused.allowed).toBe(false);
    expect(refused.remaining).toBe(0);
    // The oldest request leaves the window ten minutes after it arrived.
    expect(refused.retryAfterSeconds).toBe((ASSISTANT_WINDOW_MS - 4 * 60_000) / 1000);
    expect(toHeaders(refused)["Retry-After"]).toBe("360");
    expect((await check("a", "research", start + ASSISTANT_WINDOW_MS)).allowed).toBe(true);
    expect((await check("a", "research", start + ASSISTANT_WINDOW_MS)).allowed).toBe(false);
  });

  it("does not count a refused request", async () => {
    const check = createAssistantLimiter();
    const start = 1_000_000;
    for (let i = 0; i < 4; i++) await check("a", "research", start);
    for (let i = 1; i < 50; i++)
      expect((await check("a", "research", start + i * 1000)).allowed).toBe(false);
    expect((await check("a", "research", start + ASSISTANT_WINDOW_MS)).allowed).toBe(true);
  });

  it("stores a digest, never the address or the account", async () => {
    const { windows, keys } = sharedMemory();
    const check = createAssistantLimiter(windows);
    await check("203.0.113.7", "law", 1_000_000);
    await check("203.0.113.7", "mcp", 1_000_000);
    await check("203.0.113.8", "law", 1_000_000);
    expect(new Set(keys).size).toBe(3);
    for (const key of keys) {
      expect(key).toMatch(/^[0-9a-f]{64}$/);
      expect(key).not.toContain("203.0.113");
    }
  });

  it("keeps limiting from memory while the shared store is down, and returns to it", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { windows } = sharedMemory();
    let down = true;
    const calls = { n: 0 };
    const flaky: SharedWindows = (key, decide) => {
      calls.n++;
      return down ? Promise.reject(new Error("connection refused")) : windows(key, decide);
    };
    const check = createAssistantLimiter(flaky);
    const now = 1_000_000;
    for (let i = 0; i < 4; i++) expect((await check("a", "research", now)).allowed).toBe(true);
    expect((await check("a", "research", now)).allowed).toBe(false);
    // One failed attempt, then the store is left alone for half a minute.
    expect(calls.n).toBe(1);
    expect(warn).toHaveBeenCalledTimes(1);
    down = false;
    expect((await check("b", "research", now + 29_000)).allowed).toBe(true);
    expect(calls.n).toBe(1);
    // Well past the half minute, not at it: the back-off is counted from when
    // the attempt FAILED, so it ends 30 s plus however long the failure took.
    // Asked at exactly +30 000 this failed whenever that took a millisecond
    // (CI, twice on 2026-11-13, blocking a deploy).
    expect((await check("b", "research", now + 60_000)).allowed).toBe(true);
    expect(calls.n).toBe(2);
    warn.mockRestore();
  });

  it("remembers a refusal, so a caller who keeps knocking costs the store nothing", async () => {
    const { windows, keys } = sharedMemory();
    const check = createAssistantLimiter(windows);
    const start = 1_000_000;
    for (let i = 0; i < 4; i++) await check("a", "research", start);
    const first = await check("a", "research", start + 1000);
    expect(first.allowed).toBe(false);
    expect(keys).toHaveLength(5);
    for (let i = 0; i < 100; i++) {
      const again = await check("a", "research", start + 2000 + i);
      expect(again.allowed).toBe(false);
      expect(again.resetAt).toBe(first.resetAt);
    }
    expect(keys).toHaveLength(5);
    // The window opens when the store said it would, and the store decides again.
    expect((await check("a", "research", first.resetAt)).allowed).toBe(true);
    expect(keys).toHaveLength(6);
  });

  it("decides from memory when the shared store does not answer in time", async () => {
    const warn = quiet();
    const calls = { n: 0 };
    const hanging: SharedWindows = () => {
      calls.n++;
      return new Promise(() => undefined);
    };
    const check = createAssistantLimiter(hanging, { deadlineMs: 20 });
    const now = 1_000_000;
    const begun = Date.now();
    expect((await check("a", "research", now)).allowed).toBe(true);
    expect(Date.now() - begun).toBeLessThan(1000);
    expect(warn.mock.calls[0][0]).toContain("deadline");
    for (let i = 0; i < 3; i++) await check("a", "research", now);
    expect((await check("a", "research", now)).allowed).toBe(false);
    expect(calls.n).toBe(1);
    warn.mockRestore();
  });

  it("backs off from when the store failed, not from when the request came", async () => {
    const warn = quiet();
    const calls = { n: 0 };
    const slow: SharedWindows = () => {
      calls.n++;
      return new Promise((_, reject) => setTimeout(() => reject(new Error("refused")), 60));
    };
    const check = createAssistantLimiter(slow, { deadlineMs: 5_000 });
    const now = 1_000_000;
    await check("a", "research", now);
    expect(calls.n).toBe(1);
    // Thirty seconds after the request arrived is less than thirty after it failed.
    await check("b", "research", now + 30_000 + 10);
    expect(calls.n).toBe(1);
    await check("b", "research", now + 30_000 + 5_000);
    expect(calls.n).toBe(2);
    warn.mockRestore();
  });

  it("never logs the query or its parameters", async () => {
    const warn = quiet();
    const failing: SharedWindows = () =>
      Promise.reject(
        Object.assign(new Error("Failed query: select ... params: 203.0.113.7"), {
          cause: { code: "ECONNREFUSED" },
        }),
      );
    await createAssistantLimiter(failing)("203.0.113.7", "law", 1_000_000);
    expect(warn).toHaveBeenCalledTimes(1);
    const line = String(warn.mock.calls[0][0]);
    expect(line).toContain("ECONNREFUSED");
    expect(line).not.toContain("203.0.113");
    warn.mockRestore();
  });

  it("separates keys by secret, and stores nothing shared without one", async () => {
    const seen = (secret: string) => {
      const { windows, keys } = sharedMemory();
      return createAssistantLimiter(windows, { secret })("203.0.113.7", "law", 1_000_000).then(
        () => keys[0],
      );
    };
    expect(await seen("one")).not.toBe(await seen("two"));
    expect(sharedConfigured({ DATABASE_URL: "postgres://x" })).toBe(false);
    expect(sharedConfigured({ AUTH_SECRET: "s" })).toBe(false);
    expect(sharedConfigured({ DATABASE_URL: "postgres://x", AUTH_SECRET: "s" })).toBe(true);
    expect(sharedConfigured({ DATABASE_URL: "postgres://x", BETTER_AUTH_SECRET: "s" })).toBe(true);
  });
});
