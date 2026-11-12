import { describe, expect, it, vi } from "vitest";
import { MemoryStore } from "@bitbaum/limitkit";
import {
  ASSISTANT_LIMITS,
  ASSISTANT_WINDOW_MS,
  checkAssistantRequest,
  createAssistantLimiter,
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
    expect((await check("b", "research", now + 30_000)).allowed).toBe(true);
    expect(calls.n).toBe(2);
    warn.mockRestore();
  });
});
