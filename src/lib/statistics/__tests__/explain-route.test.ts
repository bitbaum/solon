import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  chain: vi.fn(),
  complete: vi.fn(),
  metric: vi.fn(),
  dimension: vi.fn(),
}));
vi.mock("@bitbaum/ai-kit", () => ({
  complete: mocks.complete,
  freeChain: () => [],
  usableChain: mocks.chain,
}));
vi.mock("@/lib/db/client", () => ({ db: {} }));
vi.mock("@/lib/statistics/metric-page", () => ({ loadMetricPage: mocks.metric }));
vi.mock("@/lib/statistics/dimension-page", () => ({ loadDimensionPage: mocks.dimension }));
import { POST } from "../../../app/api/v1/statistics/explain/route";

const post = (body: unknown, origin = "http://localhost") =>
  new Request("http://localhost/api/v1/statistics/explain", {
    method: "POST",
    headers: { origin, "content-type": "application/json", "x-forwarded-for": crypto.randomUUID() },
    body: JSON.stringify(body),
  });
const metric = {
  key: "tax.income.top_rate",
  unit: "ratio",
  label: { en: "Top rate" },
  statistic: {
    definition: { en: "The highest rate." },
    series: { publisher: "OECD", code: "PIT", url: "https://example.org" },
  },
};
const page = {
  metric,
  shown: [
    {
      code: "EE",
      name: "Estonia",
      jurisdictionId: "ee",
      slugPath: null,
      points: [{ year: 2025, value: 0.22, quality: "normal" }],
      source: { key: "oecd_sdmx", url: null, retrievedAt: "2026-11-09" },
    },
  ],
  years: { from: null, to: null },
  events: [],
  sanity: [],
};
const subject = { kind: "metric", metric: "tax.income.top_rate" };

beforeEach(() => {
  mocks.chain.mockReturnValue([{ model: "test" }]);
  mocks.metric.mockResolvedValue(page);
  mocks.dimension.mockResolvedValue(null);
  mocks.complete.mockReset();
});

describe("POST /api/v1/statistics/explain", () => {
  it("refuses another origin and a malformed request before any model call", async () => {
    expect((await POST(post({ subject }, "https://elsewhere.test"))).status).toBe(403);
    expect((await POST(post({ subject: { kind: "metric" } }))).status).toBe(400);
    expect((await POST(post({ subject: { kind: "other" } }))).status).toBe(400);
    expect(mocks.complete).not.toHaveBeenCalled();
  });

  it("says so when no model is configured, and when the page is unknown", async () => {
    mocks.chain.mockReturnValue([]);
    expect((await POST(post({ subject }))).status).toBe(503);
    mocks.chain.mockReturnValue([{ model: "test" }]);
    mocks.metric.mockResolvedValue(null);
    expect((await POST(post({ subject }))).status).toBe(404);
  });

  it("returns an explanation that rests on the page's own figures, read on the server", async () => {
    mocks.complete.mockResolvedValue({ text: "Estonia: 22% in 2025 [F2].", id: "x" });
    const res = await POST(post({ subject, locale: "en" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ text: "Estonia: 22% in 2025 [F2].", cited: ["F2"] });
    const given = mocks.complete.mock.calls[0]![0].messages[0].content as string;
    expect(given).toContain("Estonia, 2025: 22%");
  });

  it("does not show an explanation that states a figure the page does not hold", async () => {
    mocks.complete.mockResolvedValue({ text: "Estonia: 31% in 2025 [F2]." });
    const res = await POST(post({ subject }));
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain("31%");
    expect(mocks.complete).toHaveBeenCalledTimes(2);
  });
});
