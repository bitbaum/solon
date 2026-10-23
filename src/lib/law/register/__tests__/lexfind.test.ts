import { describe, expect, it } from "vitest";
import { fetchRegister, parseRegisterSnapshot, type RegisterSnapshot } from "../lexfind";

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });

/** A publisher with one authority of three acts, listed in two slices of its tree. */
function publisher(stated: number) {
  const requested: string[] = [];
  const doFetch = (async (input: string | URL | Request) => {
    const url = String(input);
    requested.push(url);
    if (url.endsWith("/entities/extended")) {
      return json([{ id: 7, abbreviation: "XX", status: { total_texts_of_law: stated } }]);
    }
    if (url.endsWith("/entities/7/systematics")) {
      const tree: Record<string, unknown> = { "": { children: [] } };
      for (let i = 1; i <= 70; i++) tree[String(i)] = { children: [], tols: [] };
      return json(tree);
    }
    if (url.includes("/entities/7/systematics?active_only=false")) {
      const first = url.includes("tols_for_systematics[]=1&");
      return json(
        first
          ? {
              "1": {
                tols: [
                  { id: 11, title: "A", systematic_number: "1.1", is_active: true, category_id: 4 },
                  { id: 12, title: "B", systematic_number: null, is_active: false, category_id: 6 },
                ],
              },
            }
          : {
              "61": {
                tols: [
                  { id: 13, title: "C", systematic_number: "6.1", is_active: true, category_id: 3 },
                ],
              },
            },
      );
    }
    return new Response("not found", { status: 404 });
  }) as typeof fetch;
  return { doFetch, requested };
}

describe("fetchRegister", () => {
  it("reads every slice of an authority's tree and keeps title, number and in-force flag", async () => {
    const { doFetch, requested } = publisher(3);
    const seen: string[] = [];
    const snapshot = await fetchRegister(doFetch, (code, acts) => seen.push(`${code}:${acts}`), 0);
    expect(snapshot.authorities).toHaveLength(1);
    expect(snapshot.authorities[0]!.code).toBe("XX");
    expect(snapshot.authorities[0]!.acts.map((a) => a.id).sort()).toEqual([11, 12, 13]);
    expect(snapshot.authorities[0]!.acts.find((a) => a.id === 12)).toEqual({
      id: 12,
      title: "B",
      systematicNumber: null,
      inForce: false,
      categoryId: 6,
    });
    expect(seen).toEqual(["XX:3"]);
    // 70 systematic ids are asked for in two requests, not one overlong URL.
    expect(requested.filter((u) => u.includes("active_only=false"))).toHaveLength(2);
  });

  it("refuses a partial read: a register is never imported short of what it states", async () => {
    const { doFetch } = publisher(4);
    await expect(fetchRegister(doFetch, undefined, 0)).rejects.toThrow(
      "XX: read 3 acts, the register states 4",
    );
  });
});

describe("parseRegisterSnapshot", () => {
  it("round-trips a stored snapshot and rejects a changed format loudly", () => {
    const snapshot: RegisterSnapshot = {
      fetchedAt: "2026-10-23T00:00:00.000Z",
      authorities: [
        {
          code: "XX",
          acts: [{ id: 1, title: "T", systematicNumber: "1", inForce: true, categoryId: 4 }],
        },
      ],
    };
    const bytes = new TextEncoder().encode(JSON.stringify(snapshot));
    expect(parseRegisterSnapshot(bytes)).toEqual(snapshot);
    const changed = new TextEncoder().encode(
      JSON.stringify({ ...snapshot, authorities: [{ code: "XX" }] }),
    );
    expect(() => parseRegisterSnapshot(changed)).toThrow();
  });
});
