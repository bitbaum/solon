import { describe, expect, it } from "vitest";
import { fetchOfficialLinks, parseLinksSnapshot } from "../official-links";

const json = (body: unknown) => new Response(JSON.stringify(body));

/** A register with one authority whose three acts are found under different digits of their numbers. */
function register(stated: number) {
  const searches: string[] = [];
  const acts: Record<string, { id: number; url: string | null }[]> = {
    "1": [{ id: 1, url: "https://canton.example/a" }],
    "2": [
      { id: 1, url: "https://canton.example/a" },
      { id: 2, url: "https://canton.example/b" },
    ],
    "3": [{ id: 3, url: null }],
  };
  const doFetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/entities/extended")) {
      return json([{ id: 9, abbreviation: "XX", status: { active_texts_of_law: stated } }]);
    }
    if (url.endsWith("/fulltext-search") && init?.method === "POST") {
      const body = JSON.parse(String(init.body)) as {
        search_text: string;
        entity_filter: number[];
      };
      searches.push(body.search_text);
      return json({ id: Number(body.search_text) + 100, session_id: "s" });
    }
    const m = /fulltext-search\/(\d+)\?/.exec(url);
    if (m) {
      const digit = String(Number(m[1]) - 100);
      return json({
        number_of_pages: 1,
        texts_of_law_with_matches: (acts[digit] ?? []).map((a) => ({
          id: a.id,
          dta_urls: a.url ? [{ language: "de", original_url: a.url }] : [],
        })),
      });
    }
    return new Response("not found", { status: 404 });
  }) as typeof fetch;
  return { doFetch, searches };
}

describe("fetchOfficialLinks", () => {
  it("searches by each digit of the systematic number and keeps one link per act", async () => {
    const { doFetch, searches } = register(3);
    const snapshot = await fetchOfficialLinks(doFetch, undefined, 0);
    expect(searches).toEqual([..."0123456789"]);
    expect(snapshot.authorities).toHaveLength(1);
    expect(snapshot.authorities[0]!.links.sort((a, b) => a.id - b.id)).toEqual([
      { id: 1, url: "https://canton.example/a" },
      { id: 2, url: "https://canton.example/b" },
    ]);
  });

  it("reports the few acts the search cannot find, and refuses a list well short of the register's", async () => {
    const few = await fetchOfficialLinks(register(3).doFetch, undefined, 0);
    expect(few.missing).toEqual({ XX: 0 });
    // 3 of 100 is not "a few missing": the read went wrong.
    await expect(fetchOfficialLinks(register(100).doFetch, undefined, 0)).rejects.toThrow(
      "XX: found 3 acts in force, the register states 100",
    );
    // An authority that lists more than the register states is wrong too.
    await expect(fetchOfficialLinks(register(2).doFetch, undefined, 0)).rejects.toThrow(
      "the register states 2",
    );
  });
});

describe("parseLinksSnapshot", () => {
  it("rejects a changed format loudly", () => {
    const bytes = new TextEncoder().encode(
      JSON.stringify({
        fetchedAt: "x",
        authorities: [{ code: "XX", links: [{ id: 1, url: "not a url" }] }],
      }),
    );
    expect(() => parseLinksSnapshot(bytes)).toThrow();
  });
});
