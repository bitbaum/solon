import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ transcribe: vi.fn(), configured: vi.fn() }));
vi.mock("@bitbaum/ai-kit", () => ({
  looksLikeSilence: (t: string) => !t.trim(),
  speechChain: () => [],
  speechConfigured: mocks.configured,
  transcribe: mocks.transcribe,
}));
import { POST } from "../../../app/api/transcribe/route";

const audioRequest = (ip: string, origin = "http://localhost") => {
  const body = new FormData();
  body.append("audio", new File([new Uint8Array(64)], "d.webm", { type: "audio/webm" }));
  body.append("locale", "ru");
  return new Request("http://localhost/api/transcribe", {
    method: "POST",
    headers: { origin, "x-forwarded-for": ip, "content-length": "300" },
    body,
  });
};

beforeEach(() => {
  mocks.configured.mockReturnValue(true);
  mocks.transcribe.mockResolvedValue({ text: "привет" });
});

describe("/api/transcribe", () => {
  it("transcribes for a reader with no session", async () => {
    const response = await POST(audioRequest("203.0.113.1"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ text: "привет" });
  });
  it("answers failures with a code and no sentence", async () => {
    const foreign = await POST(audioRequest("203.0.113.2", "https://elsewhere.test"));
    expect(foreign.status).toBe(403);
    mocks.configured.mockReturnValue(false);
    const off = await POST(audioRequest("203.0.113.2"));
    expect(off.status).toBe(503);
    mocks.configured.mockReturnValue(true);
    mocks.transcribe.mockRejectedValue(new Error("boom"));
    const failed = await POST(audioRequest("203.0.113.2"));
    expect(failed.status).toBe(503);
    for (const r of [foreign, off, failed]) {
      const data = await r.json();
      expect(Object.keys(data)).toEqual(["code"]);
    }
  });
  it("limits each address, with 429 and Retry-After", async () => {
    let last = 200;
    let retry: string | null = null;
    for (let i = 0; i < 45; i++) {
      const r = await POST(audioRequest("203.0.113.9"));
      last = r.status;
      retry = r.headers.get("Retry-After");
    }
    expect(last).toBe(429);
    expect(retry).toBe("600");
    expect((await POST(audioRequest("203.0.113.10"))).status).toBe(200);
  });
});
