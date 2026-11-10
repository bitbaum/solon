import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ChallengeError,
  fetchLilexDocument,
  fetchLilexPage,
  lilexId,
  lilexUrl,
  parseLilexProvisions,
  parseSystematicIds,
  pdfLinkOf,
  systematicStarts,
} from "../lilex";
import { WHOLE_ACT } from "../fedlex";

const PAGE = `<html><body>
<div class="htit1">Gesetz</div><div class="vom">vom 17. September 2008</div>
<div class="tit1"><a name="vorart:1;tit1:1"></a>I. Allgemeine Bestimmungen</div>
<div class="art">
<a name="art:1"></a>Art. 1
<div class="sacht">Gegenstand</div>
<div class="abs">Dieses Gesetz regelt die Ein- und Ausreise von Ausl&auml;ndern.</div>
</div>
<div class="art">
<a name="art:2a"></a>Art. 2a<a href="#fn5" name="fr5" ><sup>5</sup ></a>
<div class="sacht">Geltungsbereich</div>
<div class="abs">1) Es gilt f&uuml;r:
<div class="bst1">a)	Personen;</div>
<div class="bst1">b)	Sachen.<a href="#fn1" name="fr1" ><sup>1</sup ></a></div>
</div>
</div>
<div class="art">
<a name="par:1096"></a>&sect; 1096
<div class="abs">Der Bestandgeber ist verpflichtet.</div>
</div>
<div class="art"><a name="art:1"></a>Art. 1<div class="sacht">Doppelt</div><div class="abs">nie</div></div>
<div class="fntext"><a href="#fr1" name="fn1">1</a> Fussnote.</div>
</body></html>`;

describe("parseLilexProvisions", () => {
  const provisions = parseLilexProvisions(PAGE);

  it("reads the articles and §§ in order under anchors with the colon made an underscore", () => {
    expect(provisions.map((p) => p.path)).toEqual(["art_1", "art_2a", "par_1096", "art_1_n2"]);
  });

  it("heads each with its number and title, and keeps a repeated anchor under a suffix", () => {
    expect(provisions[0]).toMatchObject({
      heading: "Art. 1 Gegenstand",
      text: "Dieses Gesetz regelt die Ein- und Ausreise von Ausländern.",
    });
    expect(provisions[2]).toMatchObject({ heading: "§ 1096" });
    expect(provisions[3]).toMatchObject({
      path: "art_1_n2",
      heading: "Art. 1 Doppelt",
      text: "nie",
    });
  });

  it("drops footnote marks and keeps the list items on their own lines", () => {
    expect(provisions[1]!.heading).toBe("Art. 2a Geltungsbereich");
    expect(provisions[1]!.text).toBe("1) Es gilt für:\na) Personen;\nb) Sachen.");
  });

  it("reads an act with no provisions as one, holding the page", () => {
    const only = parseLilexProvisions(
      `<div class="htit1">Kundmachung</div><div class="abs">Text der Kundmachung.</div><div class="fntext">Note</div>`,
    );
    expect(only).toHaveLength(1);
    expect(only[0]).toMatchObject({ path: WHOLE_ACT, heading: "Kundmachung" });
    expect(only[0]!.text).toContain("Text der Kundmachung.");
    expect(only[0]!.text).not.toContain("Note");
  });
});

describe("parseLilexProvisions: the text outside the articles", () => {
  const PAGE_WITH_ANNEX = `<html><body>
<div class="htit1">Kundmachung</div><div class="vom">vom 1. Mai 2020</div>
<div class="einl">Gestützt auf Art. 3 macht die Regierung kund:</div>
<div class="tit1">I. Allgemeine Bestimmungen</div>
<div class="art"><a name="art:1"></a>Art. 1<div class="sacht">Zweck</div><div class="abs">Zweck des Gesetzes.</div></div>
<div class="tit1">Anhang I</div>
<div class="ab">Liste der Partnerstaaten</div>
<div class="ab">Albanien, Andorra</div>
<div class="art"><a name="art:2"></a>Art. 2<div class="abs">Schluss.</div></div>
<div class="tit1">Anhang II</div>
<div class="ab">Zweite Liste</div>
<div class="fntext"><a href="#fr1" name="fn1">1</a> eingefügt durch LGBl. 2024 Nr. 416.</div>
</body></html>`;
  const provisions = parseLilexProvisions(PAGE_WITH_ANNEX);

  it("keeps the promulgation before the first article and the body under each annex heading, in page order", () => {
    expect(provisions.map((p) => [p.path, p.heading])).toEqual([
      ["part_1", "Kundmachung"],
      ["art_1", "Art. 1 Zweck"],
      ["part_2", "Anhang I"],
      ["art_2", "Art. 2"],
      ["part_3", "Anhang II"],
    ]);
    expect(provisions[0]!.text).toBe("Gestützt auf Art. 3 macht die Regierung kund:");
    expect(provisions[2]!.text).toBe("Liste der Partnerstaaten\nAlbanien, Andorra");
  });

  it("gives nothing for a chapter heading with an article straight after it, and leaves footnotes out", () => {
    expect(provisions.some((p) => p.heading.startsWith("I. Allgemeine"))).toBe(false);
    expect(provisions.some((p) => p.text.includes("LGBl. 2024"))).toBe(false);
  });
});

describe("parseLilexProvisions: articles the publisher styles", () => {
  // The opening of the ABGB as gesetze.li serves it (act 1003001000, read 2026-11-10): the article under a
  // heading is `<div class="art" style="margin-top:6.5pt">`, the next one a bare `<div class="art">`.
  const abgb = parseLilexProvisions(
    readFileSync(join(__dirname, "fixtures", "lilex-abgb-first-paragraphs.fixture.html"), "utf8"),
  );

  it("keeps § 1, which stands under a heading and so carries a style attribute", () => {
    expect(abgb.map((p) => p.path)).toEqual(["par_1", "par_2", "par_3", "par_4", "par_5"]);
    expect(abgb[0]).toMatchObject({
      heading: "§ 1",
      text: "Der Inbegriff der Gesetze, wodurch die Privatrechte und Pflichten der Einwohner des Staates unter sich bestimmt werden, macht das bürgerliche Recht in demselben aus.",
    });
  });

  it("keeps a styled article that has a footnote mark and a repealed text", () => {
    expect(abgb[3]).toMatchObject({ path: "par_4", heading: "§ 4", text: "Aufgehoben" });
  });

  it("does not take the styled heading blocks for articles", () => {
    expect(abgb.some((p) => p.heading.includes("Begriff des bürgerlichen Rechtes"))).toBe(false);
  });

  it("keeps a chapter heading of any kind (tit1m, tit1ue, tits) out of the article above it and out of the provisions", () => {
    const page =
      '<div class="art"><a name="par:11"></a>§ 11<div class="abs">Elfter.</div></div><div class="tit1m">I. Hauptstück</div><div class="tit1ue">Übergangsbestimmungen</div><div class="art" style="margin-top:6pt"><a name="par:12"></a>§ 12<div class="abs">Zwölfter.</div></div>';
    expect(parseLilexProvisions(page).map((p) => [p.path, p.text])).toEqual([
      ["par_11", "Elfter."],
      ["par_12", "Zwölfter."],
    ]);
  });

  it("reads a styled article of any act the same way", () => {
    const page =
      '<div class="tit1"><a name="tit1:1"></a>I.</div><div class="art" style="margin-top:6pt"><a name="art:1"></a>Art. 1<div class="abs">Erster.</div></div><div class="art"><a name="art:2"></a>Art. 2<div class="abs">Zweiter.</div></div>';
    expect(parseLilexProvisions(page).map((p) => [p.path, p.text])).toEqual([
      ["art_1", "Erster."],
      ["art_2", "Zweiter."],
    ]);
  });
});

describe("lilexId", () => {
  it("is the issue's year, its number to three digits and 000", () => {
    expect(lilexId("2008/311", "152.20")).toBe("2008311000");
    expect(lilexId("1921/15", "101")).toBe("1921015000");
    expect(lilexId("1926/4", "216.0")).toBe("1926004000");
    expect(lilexUrl("2008311000")).toBe("https://www.gesetze.li/konso/html/2008311000");
  });
  it("takes the listed exceptions by LR number, and does not guess an issue like 60/1", () => {
    expect(lilexId(null, "210.0")).toBe("1003001000");
    expect(lilexId("1912/9", "271.0")).toBe("1912009001");
    expect(lilexId("1982/60/1", "0.101")).toBeNull();
    expect(lilexId(null, "999")).toBeNull();
  });
});

describe("fetchLilexPage", () => {
  const reply = (body: string) => (async () => new Response(body)) as unknown as typeof fetch;

  it("returns the bytes of an act's page", async () => {
    const bytes = await fetchLilexPage("2008311000", reply(PAGE));
    expect(new TextDecoder().decode(bytes!)).toContain("Gegenstand");
  });
  it("returns null for a page that is not an act", async () => {
    expect(await fetchLilexPage("1", reply("<html>Nicht gefunden</html>"))).toBeNull();
  });
  it("stops on the proof-of-work page; it is never parsed as law or solved", async () => {
    await expect(
      fetchLilexPage("1", reply("<script>function array_to_hex_string(){}</script>")),
    ).rejects.toBeInstanceOf(ChallengeError);
  });
});

describe("fetchLilexPage on the maintenance notice", () => {
  it("takes it for a page that is not there, not for the proof-of-work page", async () => {
    const notice = "<html><script>array_to_hex_string</script>Wartungsarbeiten/Maintenance</html>";
    expect(
      await fetchLilexPage(
        "1941021000",
        (async () => new Response(notice, { status: 500 })) as unknown as typeof fetch,
      ),
    ).toBeNull();
  });
});

describe("the publisher's own listing", () => {
  const LISTING = `<table>
<tr><td>210.106</td><td><a href="/konso/1010006000">Hofdekret vom 23. Juni 1821 JGS. Nr. 1771, zu § 199 ABGB</a></td><td>1010.006</td></tr>
<tr><td>0.110</td><td><a href="/konso/1995068001">Abkommen vom 2. Mai 1992 über den Europäischen Wirtschaftsraum</a></td><td></td></tr>
<tr><td>0.110</td><td><a href="/konso/1995068300">Abkommen, Teil</a></td><td></td></tr>
</table>`;
  it("maps each LR number to the id of its page, the first when a treaty is listed again for its parts", () => {
    expect([...parseSystematicIds(LISTING)]).toEqual([
      ["210.106", "1010006000"],
      ["0.110", "1995068001"],
    ]);
  });
  it("asks the act's own listing first, then each parent", () => {
    expect(systematicStarts("0.110.042.08")).toEqual(["0.110.042.08", "0.110.042", "0.110", "0"]);
    expect(systematicStarts("641")).toEqual(["641"]);
  });
});

describe("fetchLilexDocument", () => {
  const route = (routes: Record<string, Response>) =>
    (async (url: string) =>
      routes[url] ?? new Response("", { status: 404 })) as unknown as typeof fetch;

  it("reads a consolidated page as HTML", async () => {
    const doc = await fetchLilexDocument(
      "2008311000",
      route({ [lilexUrl("2008311000")]: new Response(PAGE) }),
    );
    expect(doc!.format).toBe("html");
  });
  it("falls back to the PDF of the gazette entry when there is no consolidated page", async () => {
    const pdf = new Response(new TextEncoder().encode("%PDF-1.4 text"));
    const doc = await fetchLilexDocument(
      "1941021000",
      route({
        [lilexUrl("1941021000")]: new Response(
          "<html>Wartungsarbeiten array_to_hex_string</html>",
          { status: 500 },
        ),
        "https://www.gesetze.li/chrono/1941021000": new Response(
          '<a href="/chrono/pdf/1941021000">PDF</a>',
        ),
        "https://www.gesetze.li/chrono/pdf/1941021000": pdf,
      }),
    );
    expect(doc!.format).toBe("pdf");
    expect(new TextDecoder().decode(doc!.bytes.slice(0, 5))).toBe("%PDF-");
  });
  it("is null when the entry links no PDF", async () => {
    expect(
      await fetchLilexDocument(
        "1",
        route({
          [lilexUrl("1")]: new Response("<html>Wartungsarbeiten array_to_hex_string</html>", {
            status: 500,
          }),
          "https://www.gesetze.li/chrono/1": new Response("<html>nothing</html>"),
        }),
      ),
    ).toBeNull();
  });
  it("finds the PDF link of a page", () => {
    expect(pdfLinkOf('<a href="/konso/pdf/1995068001?version=7&amp;x=1">')).toBe(
      "https://www.gesetze.li/konso/pdf/1995068001?version=7&x=1",
    );
    expect(pdfLinkOf("<html></html>")).toBeNull();
  });
});
