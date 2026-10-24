import { describe, expect, it } from "vitest";
import type { Database } from "@/lib/db/client";
import type { ProvisionHit } from "../../search";
import { refine } from "../refine";

const hit = (path: string, heading: string): ProvisionHit => ({
  actId: "11111111-1111-1111-1111-111111111111",
  authority: "ch",
  title: "Tierschutzverordnung",
  systematicNumber: "455.1",
  path,
  heading,
  lang: "de",
  excerpt: "",
  text: `${heading} text`,
  inForceFrom: "2020-01-01",
  dateBasis: "publisher",
  sourceUrl: null,
  contentSha256: "a".repeat(64),
  rank: 1,
});

const plan = { question: "fox?", authorities: ["ch"], terms: [], groups: [], language: "English" };
// Further searches would need a database; these cases make none.
const noDb = {} as Database;
const model = (text: string) => async () => ({ text });
const found = [
  hit("art_75", "Art. 75 Ausbildung von Jagdhunden"),
  hit("art_89", "Art. 89 Privates Halten von Wildtieren"),
];

describe("a second look at the search", () => {
  it("keeps what the model says bears on the question", async () => {
    const kept = await refine(noDb, model('{"relevant":[1],"missing":[]}'), plan, found);
    expect(kept.map((h) => h.path)).toEqual(["art_89"]);
  });

  it("keeps the first results when the model fails or says nothing useful", async () => {
    const failing = async () => {
      throw new Error("down");
    };
    expect(await refine(noDb, failing, plan, found)).toHaveLength(2);
    expect(await refine(noDb, model("sorry"), plan, found)).toHaveLength(2);
    expect(await refine(noDb, model('{"relevant":[],"missing":[]}'), plan, found)).toHaveLength(2);
  });

  it("ignores numbers that are not provisions, and unknown places in a further search", async () => {
    const kept = await refine(
      noDb,
      model('{"relevant":[0,7,-1,"x"],"missing":[{"authorities":["zz"],"groups":[["a"]]}]}'),
      plan,
      found,
    );
    expect(kept.map((h) => h.path)).toEqual(["art_75"]);
  });

  it("finds nothing when nothing was found", async () => {
    expect(await refine(noDb, model("{}"), plan, [])).toEqual([]);
  });
});
