import { describe, expect, it } from "vitest";
import type { Database } from "@/lib/db/client";
import { LAW_AUTHORITIES } from "@/lib/config/law";
import { LAW_TOOLS, runLawTool } from "../tools";

const noDb = {} as Database;

describe("the law register as tools", () => {
  it("offers each tool once, described for a model", () => {
    const names = LAW_TOOLS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
    for (const t of LAW_TOOLS) {
      expect(t.name).toMatch(/^law_[a-z_]+$/);
      expect(t.description.length).toBeGreaterThan(80);
    }
  });

  it("says why a call is wrong, in words a model can fix, before touching the database", async () => {
    expect(await runLawTool("law_nope", {}, { db: noDb })).toEqual({
      ok: false,
      error: "No tool named law_nope.",
    });
    const badId = await runLawTool("law_read_provision", { act: "x", path: "art_1" }, { db: noDb });
    expect(badId.ok).toBe(false);
    if (!badId.ok) expect(badId.error).toMatch(/^act: an act id/);
    const badAuthority = await runLawTool(
      "law_search",
      { query: "Miete", authorities: ["xx"] },
      { db: noDb },
    );
    expect(badAuthority.ok).toBe(false);
    const empty = await runLawTool("law_search", {}, { db: noDb });
    expect(empty).toEqual({ ok: false, error: "Give `query`, `terms` or `ideas`." });
  });

  it("takes every authority the register knows, and no other", () => {
    const search = LAW_TOOLS.find((t) => t.name === "law_search")!;
    const schema = (
      search.input as Record<string, { unwrap: () => { element: { options: string[] } } }>
    ).authorities;
    expect(schema.unwrap().element.options).toEqual(LAW_AUTHORITIES.map((a) => a.key));
  });
});
