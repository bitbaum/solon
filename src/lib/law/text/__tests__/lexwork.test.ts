import { describe, expect, it } from "vitest";
import { LAW_AUTHORITIES, LEXWORK } from "@/lib/config/law";
import {
  fetchLexworkAct,
  fetchLexworkIndex,
  inForceFrom,
  parseLexworkProvisions,
  versionsToHold,
  type LexworkAct,
} from "../lexwork";

const HOST = "zug.tlex.ch";

const act = (over: Partial<LexworkAct["text_of_law"]> = {}): LexworkAct => ({
  text_of_law: {
    systematic_number: "1.1-1",
    title: "Gemeindeordnung",
    canonical_link: `https://${HOST}/app/de/texts_of_law/1.1-1`,
    abrogated: false,
    current_version: {
      id: 944,
      version_dates_str: "Aktuelle Version in Kraft seit: 14.05.2024 (Beschlussdatum: 14.05.2024)",
    },
    old_versions: [
      { id: 600, version_dates_str: "Version in Kraft von: 01.07.2005 bis: 31.12.2019" },
      {
        id: 695,
        version_dates_str:
          "Version in Kraft von: 14.05.2024 (wurde formlos berichtigt am: 12.09.2025) (Beschlussdatum: 14.05.2024)",
      },
    ],
    future_versions: [],
    selected_version: {
      id: 944,
      json_content: {
        document: {
          content: {
            type: "title",
            children: [
              {
                uid: "t-0--t-1--a-3",
                type: "article",
                number: { de: "§&nbsp;3" },
                text: { de: "Organe" },
                children: [
                  {
                    type: "paragraph",
                    html_content: {
                      de: "<div class='paragraph'><span class='number'>1</span><p><span class='text_content'>Die Organe der Stadt sind:</span></p></div>",
                    },
                    children: [
                      {
                        type: "enumeration",
                        html_content: {
                          de: "<table><tr><td class='number'>a)</td><td>den Grossen Gemeinderat;</td></tr></table>",
                        },
                        children: [],
                      },
                    ],
                  },
                ],
              },
              {
                uid: "t-0--t-1--a-3",
                type: "article",
                number: { de: "§ 3" },
                text: { de: "Doppelt" },
                children: [],
              },
            ],
          },
        },
      },
    },
    ...over,
  },
});

describe("inForceFrom", () => {
  it("reads the day from the collection's words", () => {
    expect(
      inForceFrom("Aktuelle Version in Kraft seit: 14.05.2024 (Beschlussdatum: 14.05.2024)"),
    ).toBe("2024-05-14");
    expect(inForceFrom("Version in Kraft von: 4.10.2016 bis: 31.12.2024")).toBe("2016-10-04");
    expect(inForceFrom("vom 01.02.2005")).toBeNull();
    expect(inForceFrom(undefined)).toBeNull();
  });
});

describe("versionsToHold", () => {
  it("is oldest first, one per day, the later correction of a day replacing the earlier", () => {
    expect(versionsToHold(act(), "2026-11-01")).toEqual([
      { id: 600, inForceFrom: "2005-07-01" },
      { id: 944, inForceFrom: "2024-05-14" },
    ]);
  });
  it("leaves out a version that has not yet begun", () => {
    const future = act({
      current_version: { id: 999, version_dates_str: "Aktuelle Version in Kraft seit: 01.01.2030" },
    });
    expect(versionsToHold(future, "2026-11-01").map((v) => v.id)).toEqual([600, 695]);
  });
});

describe("parseLexworkProvisions", () => {
  it("makes each article one provision with its number, title and paragraphs, a list item on its own line", () => {
    const [first, ...rest] = parseLexworkProvisions(act());
    expect(first!.path).toBe("art_3");
    expect(first!.heading).toBe("§ 3 Organe");
    expect(first!.text).toContain("Die Organe der Stadt sind:");
    expect(first!.text).toContain("a) den Grossen Gemeinderat;");
    // The same anchor twice keeps the first.
    expect(rest).toHaveLength(0);
  });
  it("holds the whole text when there is no article, and nothing when there is no tree", () => {
    const noArticles = act();
    const tree = noArticles.text_of_law.selected_version.json_content!.document!.content!;
    tree.children = [
      { type: "paragraph", html_content: { de: "<p>Tarif: 10 Franken.</p>" }, children: [] },
    ];
    const whole = parseLexworkProvisions(noArticles);
    expect(whole[0]!.text).toContain("Tarif: 10 Franken.");
    const none = act();
    none.text_of_law.selected_version.json_content = undefined;
    expect(parseLexworkProvisions(none)).toEqual([]);
  });
});

describe("the interface", () => {
  const reply = (status: number, body: unknown) =>
    (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

  it("lists the acts and refuses an empty list", async () => {
    const listed = await fetchLexworkIndex(
      HOST,
      reply(200, {
        "3": [{ id: 1, systematic_number: "1.1-1", title: "Gemeindeordnung", abrogated: false }],
      }),
    );
    expect(listed).toEqual([
      { systematicNumber: "1.1-1", title: "Gemeindeordnung", abrogated: false },
    ]);
    await expect(fetchLexworkIndex(HOST, reply(200, {}))).rejects.toThrow(/empty/);
  });
  it("reads only the configured hosts", async () => {
    await expect(fetchLexworkIndex("example.com", reply(200, {}))).rejects.toThrow(
      /not a configured/,
    );
  });
  it("is null for an act it does not serve", async () => {
    expect(await fetchLexworkAct(HOST, "9.9", undefined, reply(404, {}))).toBeNull();
  });
});

describe("the configured collections", () => {
  it("each belong to a commune the register knows, within its canton, one collection per commune", () => {
    const authorities = LEXWORK.instances.map((i) => i.authority);
    expect(new Set(authorities).size).toBe(authorities.length);
    for (const instance of LEXWORK.instances) {
      const authority = LAW_AUTHORITIES.find((a) => a.key === instance.authority);
      expect(authority?.place?.scheme, instance.host).toBe("bfs_municipality");
      expect(authority?.key, instance.host).toBe(`bfs${authority?.place?.value}`);
      expect(LAW_AUTHORITIES.some((a) => a.key === authority?.within)).toBe(true);
      expect(instance.host).toMatch(/^[a-z0-9.-]+\.(?:tlex\.ch|bern\.ch)$/);
    }
  });
});
