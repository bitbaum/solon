import { describe, expect, it } from "vitest";
import { groupsQueries, termsQuery, type ProvisionHit } from "../../search";
import { answerMessages, sourcesOf } from "../answer";
import { planResearch, weakPlan, type Completer } from "../plan";
import { authoritiesNamed } from "../places";

describe("places in a question", () => {
  it("finds a canton by any of its names, accents or not", () => {
    expect(authoritiesNamed("Is it legal to keep a fox in Graubünden?")).toEqual(["gr"]);
    expect(authoritiesNamed("and in Lucerne?")).toEqual(["lu"]);
    expect(authoritiesNamed("a Tessin und im Wallis")).toEqual(
      expect.arrayContaining(["ti", "vs"]),
    );
    expect(authoritiesNamed("what about Grisons")).toEqual(["gr"]);
  });

  it("takes both halves of a divided canton, and the city where Zürich is meant", () => {
    expect(authoritiesNamed("in Basel")).toEqual(expect.arrayContaining(["bs", "bl"]));
    expect(authoritiesNamed("rent in Zürich")).toEqual(expect.arrayContaining(["zh", "bfs261"]));
  });

  it("does not find a place inside another word", () => {
    expect(authoritiesNamed("a jurist's opinion on the urinal")).toEqual([]);
    expect(authoritiesNamed("Zugang zum Recht")).toEqual([]);
  });
});

describe("the search terms", () => {
  it("makes prefix terms and the other spelling of an umlaut", () => {
    const q = termsQuery(["Fuchs", "Füchse halten"]);
    expect(q).toContain("fuchs:*");
    expect(q).toContain("füchse:*");
    expect(q).toContain("fuechse:*");
    expect(q.split(" | ").every((t) => t.endsWith(":*"))).toBe(true);
  });

  it("drops what cannot be a law word and anything that could break the query", () => {
    expect(termsQuery(["a", "is", "x'; drop table"])).toBe("drop:* | table:*");
    expect(termsQuery([])).toBe("");
  });
});

describe("ideas as queries", () => {
  it("asks for every idea together first, then the first alone, then any word", () => {
    expect(
      groupsQueries([
        ["Fuchs", "Wildtier"],
        ["Haltung", "Bewilligung"],
      ]),
    ).toEqual([
      "(fuchs:* | wildtier:*) & (haltung:* | bewilligung:*)",
      "fuchs:* | wildtier:*",
      "fuchs:* | wildtier:* | haltung:* | bewilligung:*",
    ]);
  });

  it("does not repeat itself for one idea, and drops an idea with no usable word", () => {
    expect(groupsQueries([["Fuchs"]])).toEqual(["fuchs:*"]);
    expect(groupsQueries([["Fuchs"], ["a"]])).toEqual(["fuchs:*"]);
    expect(groupsQueries([])).toEqual([]);
  });
});

describe("planning a search", () => {
  const model = (text: string) => async () => ({ text });

  it("uses the model's standalone question, places and law words, and adds a place the person typed", async () => {
    const plan = await planResearch(
      [
        { role: "user", content: "Is it legal to keep a fox in Graubünden?" },
        { role: "assistant", content: "..." },
        { role: "user", content: "and in Lucerne?" },
      ],
      model(
        '{"question":"Is it legal to keep a fox in Lucerne?","authorities":["gr","xx"],"language":"English","acts":["Tierschutzverordnung","x"],"groups":[["Fuchs","Wildtier"],["Bewilligung"]]}',
      ),
    );
    expect(plan.question).toBe("Is it legal to keep a fox in Lucerne?");
    expect(plan.authorities).toEqual(["ch", "gr", "lu"]);
    expect(plan.groups).toEqual([["Fuchs", "Wildtier"], ["Bewilligung"]]);
    expect(plan.terms).toEqual(["Fuchs", "Wildtier", "Bewilligung"]);
    expect(plan.language).toBe("English");
    expect(plan.acts).toEqual(["Tierschutzverordnung"]);
  });

  it("asks a second model when the plan names no act or only repeats the person's words", async () => {
    const copied =
      '{"question":"q","language":"English","acts":[],"groups":[["legal","graubünden"]]}';
    const good =
      '{"question":"q","language":"English","acts":["Tierschutzverordnung"],"groups":[["Fuchs"],["Haltung"]]}';
    const turns = [{ role: "user" as const, content: "Is it legal to keep a fox in Graubünden?" }];
    const plan = await planResearch(turns, model(copied), model(good));
    expect(plan.acts).toEqual(["Tierschutzverordnung"]);
    expect(plan.groups).toEqual([["Fuchs"], ["Haltung"]]);
    // A good first plan is not second-guessed.
    let asked = 0;
    const counting = async () => {
      asked++;
      return { text: good };
    };
    await planResearch(turns, model(good), counting);
    expect(asked).toBe(0);
  });

  it("plans the whole conversation when a follow-up has no subject of its own", async () => {
    const weak = '{"question":"lucerne","language":"English","acts":[],"groups":[["lucerne"]]}';
    const good =
      '{"question":"fox in Lucerne","language":"English","acts":["Tierschutzverordnung"],"groups":[["Fuchs"],["Haltung"]],"authorities":["gr"]}';
    // Only a single-message conversation (system prompt + one turn) is planned well.
    const byLength: Completer = async (o) => ({
      text: o.messages.length === 2 ? good : weak,
    });
    const plan = await planResearch(
      [
        { role: "user", content: "Is it legal to keep a fox in Graubünden?" },
        { role: "assistant", content: "A permit is needed." },
        { role: "user", content: "And in Lucerne?" },
      ],
      byLength,
      byLength,
    );
    expect(plan.acts).toEqual(["Tierschutzverordnung"]);
    expect(plan.authorities).toEqual(expect.arrayContaining(["ch", "gr", "lu"]));
  });

  it("keeps the first plan when the second says less", async () => {
    const some = '{"question":"q","language":"English","acts":["Jagdgesetz"],"groups":[["jagd"]]}';
    const none = '{"question":"q","language":"English","acts":[],"groups":[["fox"]]}';
    const turns = [{ role: "user" as const, content: "Is a fox huntable?" }];
    const plan = await planResearch(turns, model(none), model(none));
    expect(plan.acts).toEqual([]);
    expect((await planResearch(turns, model(some), model(none))).acts).toEqual(["Jagdgesetz"]);
  });

  it("calls a plan weak by what it names, not how long it is", () => {
    const plan = {
      question: "q",
      authorities: ["ch"],
      terms: [],
      groups: [["Fuchs"]],
      acts: ["Tierschutzgesetz"],
      language: "English",
    };
    expect(weakPlan(plan, "Is it legal to keep a fox?")).toBe(false);
    expect(weakPlan({ ...plan, acts: [] }, "Is it legal to keep a fox?")).toBe(true);
    expect(weakPlan({ ...plan, groups: [["fox"]] }, "Is it legal to keep a fox?")).toBe(true);
  });

  it("still searches when the model fails", async () => {
    const plan = await planResearch(
      [{ role: "user", content: "keeping foxes in Graubünden" }],
      async () => {
        throw new Error("down");
      },
    );
    expect(plan.authorities).toEqual(["ch", "gr"]);
    expect(plan.question).toBe("keeping foxes in Graubünden");
    expect(plan.terms.length).toBeGreaterThan(0);
  });

  it("survives an answer that is not JSON", async () => {
    const plan = await planResearch(
      [{ role: "user", content: "Mietzins in Bern" }],
      model("sorry"),
    );
    expect(plan.authorities).toEqual(["ch", "be"]);
  });
});

describe("the answer's sources", () => {
  const hit: ProvisionHit = {
    actId: "11111111-1111-1111-1111-111111111111",
    authority: "gr",
    title: "Jagdgesetz",
    systematicNumber: "740.000",
    path: "art_12",
    heading: "Art. 12 Halten von Wildtieren",
    lang: "de",
    excerpt: "",
    text: "Wer Wildtiere hält, braucht eine Bewilligung.",
    inForceFrom: "2020-01-01",
    dateBasis: "retrieved",
    sourceUrl: null,
    contentSha256: "a".repeat(64),
    rank: 1,
  };

  it("hands each provision a handle that links to where it is read", () => {
    expect(sourcesOf([hit])).toEqual([
      expect.objectContaining({
        id: "L1",
        href: "/law/11111111-1111-1111-1111-111111111111#art_12",
      }),
    ]);
  });

  it("puts the provisions, and only those, in front of the model", () => {
    const messages = answerMessages(
      [{ role: "user", content: "fox?" }],
      {
        question: "fox?",
        authorities: ["ch", "gr"],
        terms: [],
        groups: [],
        acts: [],
        language: "English",
      },
      [hit],
    );
    expect(messages[0]!.content).toContain("[L1] Graubünden");
    expect(messages[0]!.content).toContain("braucht eine Bewilligung");
    expect(messages[0]!.content).toContain("Never add law from memory");
    expect(messages.at(-1)).toEqual({ role: "user", content: "fox?" });
  });
});
