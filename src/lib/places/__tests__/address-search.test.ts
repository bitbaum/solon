import { afterEach, describe, expect, it, vi } from "vitest";
import { searchAddresses } from "../address-search";

const search = {
  format: "geoadmin_search" as const,
  url: "https://geocoder.example/search",
  provider: "Example",
};

function respond(body: unknown, ok = true) {
  const fetchMock = vi.fn(async () => ({ ok, json: async () => body }) as Response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("searchAddresses", () => {
  it("asks for addresses in WGS84 without cookies or referrer, and strips the label's markup", async () => {
    const fetchMock = respond({
      results: [
        { attrs: { label: "<b>Bahnhofstrasse</b> 1 8001  Zürich", lat: 47.37, lon: 8.54 } },
      ],
    });
    const hits = await searchAddresses(search, "Bahnhofstrasse 1", new AbortController().signal, 3);
    expect(hits).toEqual([{ label: "Bahnhofstrasse 1 8001 Zürich", position: [8.54, 47.37] }]);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.searchParams.get("searchText")).toBe("Bahnhofstrasse 1");
    expect(url.searchParams.get("origins")).toBe("address");
    expect(url.searchParams.get("sr")).toBe("4326");
    expect(url.searchParams.get("limit")).toBe("3");
    expect(init).toMatchObject({ credentials: "omit", referrerPolicy: "no-referrer" });
  });

  it("finds nothing when the service fails or answers in an unexpected shape", async () => {
    respond({}, false);
    expect(await searchAddresses(search, "x", new AbortController().signal)).toEqual([]);
    respond({ results: [{ attrs: { label: "no position" } }] });
    expect(await searchAddresses(search, "x", new AbortController().signal)).toEqual([]);
  });
});
