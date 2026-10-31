import { describe, expect, it } from "vitest";
import { STRUCTURE_KINDS, STRUCTURE_ROWS, type StructureKind } from "@/lib/config/structures";
import { citedProvisions, provisionKey, sha256, structureTable, type ProvisionText } from "../view";

const TEXT = "1) Das Mindestkapital beträgt 30 000\nFranken.\n2) Weiteres.";
const kind = (quote: string, hash = sha256(TEXT)): StructureKind => ({
  key: "testForm",
  place: "testland",
  act: "act-1",
  facts: [
    {
      row: "minimumCapital",
      value: { kind: "amount", amount: 30_000, currency: "CHF" },
      cites: [{ act: "act-1", path: "art_1", sha256: hash, quote }],
    },
  ],
});
const law = (text = TEXT) =>
  new Map<string, ProvisionText>([
    [provisionKey({ act: "act-1", path: "art_1" }), { heading: "Art. 1", text, sourceUrl: null }],
  ]);
const capital = (k: StructureKind, provisions: Map<string, ProvisionText>) =>
  structureTable([k], provisions).rows.find((r) => r.row === "minimumCapital")!.cells[0];

describe("the structures comparison", () => {
  it("shows a fact whose provision still says it, whatever the line breaks", () => {
    const cell = capital(kind("Das Mindestkapital beträgt 30 000 Franken."), law());
    expect(cell?.cites[0]?.status).toBe("holds");
  });

  it("says when the provision changed since it was read but still says it", () => {
    const cell = capital(kind("Das Mindestkapital beträgt 30 000 Franken.", "0".repeat(64)), law());
    expect(cell?.cites[0]?.status).toBe("amended");
  });

  it("shows a fact as missing when the law no longer says it, or is not held", () => {
    const quote = "Das Mindestkapital beträgt 30 000 Franken.";
    expect(capital(kind(quote), law("1) Das Mindestkapital beträgt 50 000 Franken."))).toBeNull();
    expect(capital(kind(quote), new Map())).toBeNull();
  });

  it("gives every structure the same rows, in the same order", () => {
    const table = structureTable(STRUCTURE_KINDS, new Map());
    expect(table.rows.map((r) => r.row)).toEqual([...STRUCTURE_ROWS]);
    for (const r of table.rows) expect(r.cells).toHaveLength(STRUCTURE_KINDS.length);
  });
});

describe("the register's citations", () => {
  it("each names an act, an anchor, the words and a sha256", () => {
    for (const c of citedProvisions(STRUCTURE_KINDS)) {
      expect(c.act).toMatch(/^[0-9a-f-]{36}$/);
      expect(c.path).toMatch(/^(art|par)_\w+$/);
    }
    for (const k of STRUCTURE_KINDS)
      for (const f of k.facts) {
        expect(f.cites.length).toBeGreaterThan(0);
        for (const c of f.cites) {
          expect(c.quote.length).toBeGreaterThan(10);
          expect(c.sha256).toMatch(/^[0-9a-f]{64}$/);
        }
      }
  });

  it("states each row of a structure once", () => {
    for (const k of STRUCTURE_KINDS)
      expect(new Set(k.facts.map((f) => f.row)).size).toBe(k.facts.length);
  });
});
