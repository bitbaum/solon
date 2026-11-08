import { describe, expect, it } from "vitest";
import { LAW_AUTHORITIES } from "@/lib/config/law";
import { actToMarkdown } from "../markdown";
import { chainOf, levelOf, parentOf, placeTree } from "../places";

const counts = LAW_AUTHORITIES.map((a) => ({
  key: a.key,
  name: a.name,
  inForce: 1,
  notInForce: 0,
  withText: 1,
}));

describe("the place tree", () => {
  it("puts a commune under its canton and the canton under its country", () => {
    expect(chainOf("bfs1701").map((a) => a.key)).toEqual(["bfs1701", "zg", "ch"]);
    expect(chainOf("zg").map((a) => a.key)).toEqual(["zg", "ch"]);
    expect(chainOf("ch").map((a) => a.key)).toEqual(["ch"]);
  });

  it("puts Liechtenstein's communes under Liechtenstein, not under Switzerland", () => {
    expect(chainOf("li7001").map((a) => a.key)).toEqual(["li7001", "li"]);
  });

  it("puts a member state under the European Union, and a country outside it under nothing", () => {
    expect(chainOf("ee").map((a) => a.key)).toEqual(["ee", "eu"]);
    expect(chainOf("lux").map((a) => a.key)).toEqual(["lux", "eu"]);
    expect(chainOf("at").map((a) => a.key)).toEqual(["at", "eu"]);
    expect(chainOf("de").map((a) => a.key)).toEqual(["de", "eu"]);
    expect(chainOf("eu").map((a) => a.key)).toEqual(["eu"]);
    expect(chainOf("ch").map((a) => a.key)).toEqual(["ch"]);
    expect(chainOf("li").map((a) => a.key)).toEqual(["li"]);
    expect(levelOf(LAW_AUTHORITIES.find((a) => a.key === "eu")!)).toBe("union");
  });

  it("names a level for every authority and a parent for every place below a country", () => {
    for (const a of LAW_AUTHORITIES) {
      const level = levelOf(a);
      if (level === "union") expect(parentOf(a.key)).toBeNull();
      else if (level === "country") {
        const parent = parentOf(a.key);
        expect(parent === null || levelOf(parent) === "union", a.key).toBe(true);
      } else expect(parentOf(a.key), a.key).not.toBeNull();
    }
  });

  it("nests the members Solon holds under the union in the tree", () => {
    const eu = placeTree(counts).find((n) => n.key === "eu")!;
    expect(eu.children.map((c) => c.key).sort()).toEqual(["at", "de", "ee", "lux"]);
  });

  it("lists every authority once, under exactly one root", () => {
    const seen: string[] = [];
    const walk = (nodes: ReturnType<typeof placeTree>) =>
      nodes.forEach((n) => {
        seen.push(n.key);
        walk(n.children);
      });
    walk(placeTree(counts));
    expect(seen.sort()).toEqual(LAW_AUTHORITIES.map((a) => a.key).sort());
  });

  it("leaves out a place with no law and no descendant that has any", () => {
    const empty = counts.map((c) => ({ ...c, inForce: 0 }));
    expect(placeTree(empty)).toEqual([]);
  });
});

describe("an act as Markdown", () => {
  it("carries its provenance in the front matter and an anchor on every heading", () => {
    const md = actToMarkdown(
      {
        id: "9e7e578f-f8c5-4577-873f-fd16d1f704a2",
        authority: "bfs1701",
        kind: "communal_act",
        inForce: true,
        title: "Gemeindeordnung",
        systematicNumber: "1.1-1",
        officialUrl: null,
        version: {
          lang: "de",
          inForceFrom: "2024-01-01",
          dateBasis: "publisher",
          status: "consolidated",
          sourceUrl: "https://example.org/a",
          contentSha256: "abc",
          retrievedOn: "2026-11-01",
          provisionCount: 1,
        },
        provisions: [{ path: "art_1", heading: "Art. 1", text: "Text." }],
      },
      "https://solon.test",
    );
    expect(md).toContain("applies_also_from: [zg, ch]");
    expect(md).toContain("sha256: abc");
    expect(md).toContain("## Art. 1 {#art_1}");
  });
});
