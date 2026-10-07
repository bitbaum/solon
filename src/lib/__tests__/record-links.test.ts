/**
 * ROADMAP.md and CHANGELOG.md link to each other through `{#id}` tokens
 * (bip-kit linkDevelopment): a milestone declares an id, the changelog line
 * that delivered it cites the same id, and /roadmap and /changelog link both
 * ways. A typo would silently drop the link, so the files are held to it.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readRefs } from "bip-kit";

const read = (name: string) => readFileSync(join(process.cwd(), name), "utf8").split("\n");

/** Ids on goal headings and milestone lines — the first line, which is what the map reads. */
function declared(): string[] {
  return read("ROADMAP.md")
    .filter((l) => /^###\s|^\s*[-*]\s+\[[ xX]\]\s/.test(l))
    .flatMap((l) => readRefs(l).refs);
}

describe("roadmap ↔ changelog links", () => {
  it("declares each id once, on the line the map reads", () => {
    const ids = declared();
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
    const all = read("ROADMAP.md").flatMap((l) => readRefs(l).refs);
    expect(all.filter((id) => !ids.includes(id))).toEqual([]);
  });

  it("every id the changelog cites is declared on the roadmap", () => {
    const ids = new Set(declared());
    const cited = read("CHANGELOG.md").flatMap((l) => readRefs(l).refs);
    expect(cited.filter((id) => !ids.has(id))).toEqual([]);
  });

  it("every ticked milestone with an id is delivered by some changelog line", () => {
    const cited = new Set(read("CHANGELOG.md").flatMap((l) => readRefs(l).refs));
    const done = read("ROADMAP.md")
      .filter((l) => /^\s*[-*]\s+\[[xX]\]\s/.test(l))
      .flatMap((l) => readRefs(l).refs);
    expect(done.filter((id) => !cited.has(id))).toEqual([]);
  });
});
