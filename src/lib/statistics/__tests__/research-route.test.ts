import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ chain: vi.fn(), complete: vi.fn() }));
vi.mock("@bitbaum/ai-kit", () => ({
  complete: mocks.complete,
  freeChain: () => [],
  usableChain: mocks.chain,
}));
vi.mock("@/lib/db/client", () => ({ db: {} }));
import { POST } from "../../../app/api/v1/statistics/research/route";

const post = (body: unknown, origin = "http://localhost") =>
  new Request("http://localhost/api/v1/statistics/research", {
    method: "POST",
    headers: { origin, "content-type": "application/json", "x-forwarded-for": crypto.randomUUID() },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  mocks.chain.mockReturnValue([{ model: "test" }]);
  mocks.complete.mockReset();
});

describe("POST /api/v1/statistics/research", () => {
  it("refuses another origin, a too-short question and a missing body before any model call", async () => {
    expect(
      (await POST(post({ question: "How does tax compare?" }, "https://elsewhere.test"))).status,
    ).toBe(403);
    expect((await POST(post({ question: "tax" }))).status).toBe(400);
    expect((await POST(post({}))).status).toBe(400);
    expect(mocks.complete).not.toHaveBeenCalled();
  });

  it("says so when no model is configured", async () => {
    mocks.chain.mockReturnValue([]);
    expect((await POST(post({ question: "How does tax compare?" }))).status).toBe(503);
  });

  it("limits how often one address may ask", async () => {
    const address = "203.0.113.9";
    const same = () =>
      new Request("http://localhost/api/v1/statistics/research", {
        method: "POST",
        headers: {
          origin: "http://localhost",
          "content-type": "application/json",
          "x-forwarded-for": address,
        },
        body: JSON.stringify({ question: "How does tax compare?" }),
      });
    mocks.complete.mockResolvedValue({ text: "DONE", toolCalls: [] });
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) statuses.push((await POST(same())).status);
    expect(statuses.slice(0, 4).every((s) => s === 200)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
  });
});
