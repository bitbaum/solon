import { describe, expect, it } from "vitest";
import { ChallengeError, fetchLilexPage, lilexId, lilexUrl, parseLilexProvisions } from "../lilex";
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
    expect(provisions.map((p) => p.path)).toEqual(["art_1", "art_2a", "par_1096"]);
  });

  it("heads each with its number and title, and keeps the first of a repeated anchor", () => {
    expect(provisions[0]).toMatchObject({
      heading: "Art. 1 Gegenstand",
      text: "Dieses Gesetz regelt die Ein- und Ausreise von Ausländern.",
    });
    expect(provisions[2]).toMatchObject({ heading: "§ 1096" });
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
