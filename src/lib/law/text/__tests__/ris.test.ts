import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { RIS } from "@/lib/config/law";
import {
  actOfDocument,
  actsOfDocuments,
  ask,
  inForceFromOf,
  isActPage,
  kindOf,
  latestQuery,
  listInForce,
  pageOf,
  parseRisHtml,
  pathOf,
  registerQuery,
  risText,
  textUrlOf,
} from "../ris";

/**
 * Fixtures (src/lib/law/text/__tests__/fixtures):
 *  - ris-brkons-page.fixture.json: three real documents of the OGD-RIS API's answer (the ABGB's
 *    own document and its §§ 1 and 2, from the philrox/ris-mcp-ts test fixtures, which are
 *    verbatim captures), in an envelope written by hand after the handbook's response paths,
 *    plus two hand-written documents (a Verordnung, an act that ended);
 *  - ris-10001597-dsg.fixture.html: three real content blocks of the RIS's whole-act page for the
 *    Datenschutzgesetz ("§ 0", "Art. 1 § 1", "Art. 2 § 4"), the amendment list cut short;
 *  - ris-articles-annex.approximated.fixture.html: HAND-WRITTEN blocks for an article and an
 *    annex, the markers the RIS's search help names; an approximation until a live run reads one.
 */
const fixture = (name: string) => readFileSync(join(__dirname, "fixtures", name), "utf8");
const page = JSON.parse(fixture("ris-brkons-page.fixture.json"));
const TODAY = "2026-11-08";

describe("the API's answer", () => {
  it("reads the documents and how many the query matched", () => {
    const answer = pageOf(page);
    expect(answer.hits).toBe(5);
    expect(answer.documents).toHaveLength(5);
  });

  it("reads one document, which the API gives as an object, not a list", () => {
    const one = pageOf({
      OgdSearchResult: {
        OgdDocumentResults: {
          Hits: "1",
          OgdDocumentReference: page.OgdSearchResult.OgdDocumentResults.OgdDocumentReference[0],
        },
      },
    });
    expect(one.documents).toHaveLength(1);
    expect(one.hits).toBe(1);
  });

  it("makes an error the API states an error", () => {
    expect(() =>
      pageOf({
        OgdSearchResult: { Error: { Applikation: "BrKons", Message: "Ungültiger Parameter" } },
      }),
    ).toThrow(/Ungültiger Parameter/);
  });

  it("asks in the API's own parameter names, a hundred to a page", () => {
    const q = registerQuery(TODAY, 3);
    expect(q.get("Applikation")).toBe("BrKons");
    expect(q.get("Fassung.FassungVom")).toBe(TODAY);
    expect(q.get("DokumenteProSeite")).toBe("OneHundred");
    expect(q.get("Seitennummer")).toBe("3");
    expect(q.get("Abschnitt.Typ")).toBe("Paragraph");
    const l = latestQuery("10001622", TODAY);
    expect(l.get("Gesetzesnummer")).toBe("10001622");
    expect(l.get("Sortierung.SortedByColumn")).toBe("Inkrafttretensdatum");
    expect(l.get("Sortierung.SortDirection")).toBe("Descending");
  });
});

describe("the register", () => {
  const documents = pageOf(page).documents;

  it("reads an act from its own document: Gesetzesnummer, Kurztitel, Langtitel, kind, dates", () => {
    const read = actOfDocument(documents[0]!, TODAY);
    expect(read).toMatchObject({ norm: true, inForce: true });
    const act = (read as { act: Parameters<typeof kindOf> extends never ? never : any }).act;
    expect(act).toMatchObject({
      gesetzesnummer: "10001622",
      nor: "NOR40198929",
      title: "Allgemeines bürgerliches Gesetzbuch",
      typ: "BG",
      kind: "statute",
      changed: "2026-07-30",
      firstInForce: "1812-01-01",
      textUrl:
        "https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10001622",
    });
    expect(act.langtitel).toMatch(
      /^Allgemeines bürgerliches Gesetzbuch für die gesammten deutschen Erbländer .* StF: JGS Nr\. 946\/1811$/,
    );
  });

  it("lists each act once, from its own document when the page has it", () => {
    // A section's document first, then the act's own: the act is the second's.
    const { acts, skipped } = actsOfDocuments(
      [documents[1]!, documents[0]!, documents[2]!, documents[3]!, documents[4]!],
      TODAY,
    );
    expect([...acts.keys()].sort()).toEqual(["10001622", "99000001"]);
    expect(acts.get("10001622")!.norm).toBe(true);
    expect(acts.get("10001622")!.act.nor).toBe("NOR40198929");
    // The act that ended on 2019-12-31 is left out, with why.
    expect(skipped).toEqual([{ act: "99000002", reason: "ended" }]);
  });

  it("lists an act from a section's document when its own is not on the page", () => {
    const { acts } = actsOfDocuments([documents[1]!], TODAY);
    expect(acts.get("10001622")!.norm).toBe(false);
    expect(acts.get("10001622")!.act.title).toBe("Allgemeines bürgerliches Gesetzbuch");
  });

  it("takes the kind from the RIS's type, else the title's first word", () => {
    expect(kindOf("V", "Beispielverordnung")).toBe("ordinance");
    expect(kindOf("BVG", "Neutralitätsgesetz")).toBe("constitution");
    expect(kindOf(null, "Kundmachung der Bundesregierung")).toBe("notice");
    expect(kindOf("ZZ", "Verordnung über etwas")).toBe("ordinance");
    expect(kindOf("ZZ", "Etwas anderes")).toBe("other");
  });

  it("falls back on the Langtitel's first line when there is no Kurztitel", () => {
    const doc = structuredClone(documents[3]!) as any;
    delete doc.Data.Metadaten.Bundesrecht.Kurztitel;
    const read = actOfDocument(doc, TODAY) as any;
    expect(read.act.title).toBe(
      "Verordnung des Bundesministers über ein Beispiel (Beispielverordnung)",
    );
  });

  it("builds a text address from the Gesetzesnummer", () => {
    expect(textUrlOf("10001597")).toBe(
      "https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10001597",
    );
  });

  it("pages through the register, paced, and stops at the last page", async () => {
    const mk = (n: number) =>
      Array.from({ length: n }, (_, i) =>
        structuredClone({
          ...documents[3]!,
        }),
      ).map((d: any, i) => {
        d.Data.Metadaten.Bundesrecht.BrKons.Gesetzesnummer = String(7000000 + i + n * 1000);
        return d;
      });
    const asked: string[] = [];
    const doFetch = (async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      asked.push(url.searchParams.get("Seitennummer")!);
      const p = Number(url.searchParams.get("Seitennummer"));
      return Response.json({
        OgdSearchResult: {
          OgdDocumentResults: {
            Hits: { "@pageNumber": String(p), "@pageSize": "100", "#text": "130" },
            OgdDocumentReference: p === 1 ? mk(100) : mk(30),
          },
        },
      });
    }) as typeof fetch;
    const out = await listInForce(doFetch, { today: TODAY, pauseMs: 0 });
    expect(asked).toEqual(["1", "2"]);
    expect(out.acts).toHaveLength(130);
    expect(out.hits).toBe(130);
  });

  it("stops reading once a trial run has enough acts", async () => {
    const asked: number[] = [];
    const doFetch = (async (input: RequestInfo | URL) => {
      asked.push(Number(new URL(String(input)).searchParams.get("Seitennummer")));
      const docs = Array.from({ length: 100 }, (_, i) => {
        const d = structuredClone(documents[3]!) as any;
        d.Data.Metadaten.Bundesrecht.BrKons.Gesetzesnummer = String(asked.length * 1000 + i);
        return d;
      });
      return Response.json({
        OgdSearchResult: { OgdDocumentResults: { Hits: "6000", OgdDocumentReference: docs } },
      });
    }) as typeof fetch;
    const out = await listInForce(doFetch, { today: TODAY, pauseMs: 0, stopAfter: 150 });
    expect(asked).toEqual([1, 2]);
    expect(out.acts.length).toBe(200);
    expect(out.hits).toBe(6000);
  });
});

describe("asking the API politely", () => {
  const ok = () => Response.json({ OgdSearchResult: { OgdDocumentResults: { Hits: "0" } } });

  it("asks again after a 429 and after a dropped connection, never after an answer", async () => {
    let calls = 0;
    const doFetch = (async () => {
      calls++;
      if (calls === 1)
        return new Response("slow down", { status: 429, headers: { "retry-after": "0" } });
      if (calls === 2) throw new TypeError("fetch failed");
      return ok();
    }) as typeof fetch;
    const out = await ask(registerQuery(TODAY, 1), doFetch, 0);
    expect(out.hits).toBe(0);
    expect(calls).toBe(3);
  });

  it("does not ask again after an error the API states", async () => {
    let calls = 0;
    const doFetch = (async () => {
      calls++;
      return Response.json({ OgdSearchResult: { Error: { Message: "bad" } } });
    }) as typeof fetch;
    await expect(ask(registerQuery(TODAY, 1), doFetch, 0)).rejects.toThrow(
      /RIS answered an error: bad/,
    );
    expect(calls).toBe(1);
  });

  it("gives up after three tries and says what the RIS answered", async () => {
    const doFetch = (async () => new Response("", { status: 503 })) as typeof fetch;
    await expect(ask(registerQuery(TODAY, 1), doFetch, 0)).rejects.toThrow(/RIS answered 503/);
  });

  it("finds the day the text in force began: the latest section day on or before today", async () => {
    const doc = (day: string) => {
      const d = structuredClone(pageOf(page).documents[1]!) as any;
      d.Data.Metadaten.Bundesrecht.BrKons.Inkrafttretensdatum = day;
      return d;
    };
    const doFetch = (async () =>
      Response.json({
        OgdSearchResult: {
          OgdDocumentResults: {
            Hits: "3",
            // A day after today is never the day of the text in force today.
            OgdDocumentReference: [doc("2027-01-01"), doc("2025-10-01"), doc("1917-01-01")],
          },
        },
      })) as typeof fetch;
    expect(await inForceFromOf("10001622", TODAY, doFetch, 0)).toBe("2025-10-01");
  });

  it("finds no day when the API gives none", async () => {
    const doFetch = (async () =>
      Response.json({ OgdSearchResult: { OgdDocumentResults: { Hits: "0" } } })) as typeof fetch;
    expect(await inForceFromOf("1", TODAY, doFetch, 0)).toBeNull();
  });
});

describe("the text", () => {
  const dsg = parseRisHtml(fixture("ris-10001597-dsg.fixture.html"));

  it("cuts the whole act into the RIS's own markers", () => {
    expect(dsg.map((p) => p.path)).toEqual(["§ 0", "Art. 1 § 1", "Art. 2 § 4"]);
    expect(dsg.map((p) => p.heading)).toEqual([
      "Langtitel",
      "Art. 1 § 1 Grundrecht auf Datenschutz",
      expect.stringMatching(/^Art\. 2 § 4 /),
    ]);
  });

  it("opens with the Langtitel and the Präambel, and leaves out the list of amendments and the contents", () => {
    const opening = dsg[0]!.text;
    expect(opening).toContain(
      "Bundesgesetz zum Schutz natürlicher Personen bei der Verarbeitung personenbezogener Daten (Datenschutzgesetz – DSG)",
    );
    expect(opening).toContain("StF: BGBl. I Nr. 165/1999");
    expect(opening).toContain("Der Nationalrat hat beschlossen:");
    expect(opening).not.toContain("BGBl. I Nr. 136/2001");
    expect(opening).not.toContain("Inhaltsverzeichnis");
    expect(opening).not.toContain("Umsetzungshinweis");
  });

  it("keeps a subsection's number with its words and says every number once", () => {
    const text = dsg[1]!.text;
    expect(text).toContain("(1) Jedermann hat, insbesondere auch im Hinblick");
    expect(text).toContain(
      "(4) Beschränkungen der Rechte nach Abs. 3 sind nur unter den in Abs. 2 genannten",
    );
    // The screen reader's second voice is not words of the law.
    expect(text).not.toMatch(/Absatz eins|Paragraph eins|Ziffer eins|Artikel 8, Absatz 2/);
    expect(text).not.toContain("Bundesgesetzblatt Nr.");
    // Each citation once.
    expect(text.match(/Soweit die Verwendung von personenbezogenen Daten/g)).toHaveLength(1);
  });

  it("keeps a list point's number and text on one line", () => {
    const lines = dsg[1]!.text.split("\n");
    expect(lines).toContain(
      "1. das Recht auf Auskunft darüber, wer welche Daten über ihn verarbeitet, woher die Daten stammen, und wozu sie verwendet werden, insbesondere auch, an wen sie übermittelt werden;",
    );
    expect(lines.some((l) => l.startsWith("2. das Recht auf Richtigstellung"))).toBe(true);
  });

  it("puts a heading on a line of its own", () => {
    const lines = dsg[1]!.text.split("\n");
    expect(lines.slice(0, 3)).toEqual([
      "Artikel 1",
      "(Verfassungsbestimmung)",
      "Grundrecht auf Datenschutz",
    ]);
  });

  it("names the article and the annex of an act laid out that way (approximated markup)", () => {
    const out = parseRisHtml(fixture("ris-articles-annex.approximated.fixture.html"));
    expect(out.map((p) => p.path)).toEqual(["Art. 7", "Anlage 1"]);
    expect(out[0]!.text).toContain("(1) Alle Bundesbürger sind vor dem Gesetz gleich.");
    expect(out[0]!.text).not.toContain("Absatz eins");
    expect(out[1]!.heading).toBe("Anlage 1 Gebührentarif");
    expect(out[1]!.text).toContain("Tarif A 10 Euro");
  });

  it("writes Anl. as Anlage and collapses the marker's spacing", () => {
    expect(pathOf("\n    Anl.&nbsp;2\n  ")).toBe("Anlage 2");
    expect(pathOf("Art. 2 &#167; 4")).toBe("Art. 2 § 4");
    expect(pathOf("§ 12a")).toBe("§ 12a");
  });

  it("gives a path once: a marker the page repeats takes -2", () => {
    const block = (n: string) =>
      `<div class="documentContent"><h2 class="onlyScreenreader">§ 5</h2><div id="x_TextContainer_${n}" class="p embeddedContent"><h3>Text</h3><div>Wort ${n}</div></div></div>`;
    const out = parseRisHtml(`<body>${block("1")}${block("2")}</body>`);
    expect(out.map((p) => p.path)).toEqual(["§ 5", "§ 5-2"]);
  });

  it("keeps the words of a page whose blocks carry no marker as one provision", () => {
    const out = parseRisHtml(
      `<body><div class="documentContent"><div id="x_TextContainer_1" class="p"><h3>Text</h3><div>Nur Worte.</div></div></div></body>`,
    );
    expect(out).toEqual([{ path: "text", heading: "", text: "Nur Worte." }]);
  });

  it("knows an act's page from a notice in its place", () => {
    expect(isActPage(fixture("ris-10001597-dsg.fixture.html"))).toBe(true);
    expect(
      isActPage("<html><body><h1>Fehler</h1><p>Die Seite wurde nicht gefunden.</p></body></html>"),
    ).toBe(false);
    expect(parseRisHtml("<html><body>nothing</body></html>")).toEqual([]);
  });

  it("strips both voices of a number the way the page says it", () => {
    expect(
      risText(
        '<span aria-hidden="true" class="Absatzzahl">(2)</span><span class="sr-only">Absatz 2,</span><span>Text.</span>',
      ),
    ).toBe("(2) Text.");
  });

  it("is configured for the RIS and nothing else", () => {
    expect(RIS.hosts).toContain("data.bka.gv.at");
    expect(RIS.licenceSpdx).toBe("CC-BY-4.0");
  });
});
