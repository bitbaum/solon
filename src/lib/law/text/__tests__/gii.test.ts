/**
 * Germany's federal law: the table of contents and an act's XML, read as
 * Gesetze im Internet publishes them (design: gii.ts).
 *
 * The fixtures are HAND-WRITTEN APPROXIMATIONS, not captures: the portal could
 * not be reached from the sandbox this was written in. Their headers say which
 * words are the portal's (titles of four acts, the Grundgesetz's Art 1 and
 * Art 12a (1)) and which are made up; the markup follows the DTD as third-party
 * descriptions give it. The server's dry run against the live portal is what
 * checks the reader against the real files.
 */
import { zipSync } from "fflate";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  abbrOfLink,
  anchorOf,
  giiText,
  isGiiXml,
  isToc,
  isZip,
  kindOfTitle,
  metadataOf,
  parseGiiXml,
  parseToc,
  xmlOfZip,
} from "../gii";

const fixture = (name: string) => readFileSync(join(__dirname, "fixtures", name), "utf8");

describe("the table of contents", () => {
  const toc = parseToc(fixture("gii-toc.fixture.xml"));

  it("lists each act once, by the abbreviation its link names, with its long title", () => {
    expect(toc.acts.map((a) => a.abbr)).toEqual([
      "1-dm-goldm_nzg",
      "bgb",
      "gg",
      "urv",
      "beispo",
      "beispg_2v",
      "beispausschgo",
    ]);
    expect(toc.acts[0]!.title).toBe(
      'Gesetz über die Ausprägung einer 1-DM-Goldmünze und die Errichtung der Stiftung "Geld und Währung"',
    );
    expect(toc.acts[1]!.title).toBe("Bürgerliches Gesetzbuch");
    expect(
      parseToc(
        "<items><item><title>Erste Verordnung zur Durchführung des Beispielgesetzes *)</title><link>http://x/b/xml.zip</link></item></items>",
      ).acts[0]!.title,
    ).toBe("Erste Verordnung zur Durchführung des Beispielgesetzes");
  });

  it("leaves out an entry with no link, and says why", () => {
    expect(toc.skipped).toEqual([{ row: "Entry with no link", reason: "no link to an act's zip" }]);
  });

  it("takes the kind from the title", () => {
    expect(Object.fromEntries(toc.acts.map((a) => [a.abbr, a.kind]))).toEqual({
      "1-dm-goldm_nzg": "statute",
      bgb: "statute",
      gg: "constitution",
      urv: "ordinance",
      beispo: "notice",
      beispg_2v: "ordinance",
      beispausschgo: "regulation",
    });
  });

  it("knows a table of contents from an error page", () => {
    expect(isToc(fixture("gii-toc.fixture.xml"))).toBe(true);
    expect(isToc("<html><body>Wartungsarbeiten</body></html>")).toBe(false);
  });
});

describe("the kind of an act", () => {
  it.each([
    ["Strafgesetzbuch", "statute"],
    ["Gesetz zu dem Abkommen zwischen der Bundesrepublik Deutschland und Beispielland", "statute"],
    ["Abkommen zwischen der Bundesrepublik Deutschland und Beispielland", "treaty"],
    ["Straßenverkehrs-Zulassungs-Verordnung", "ordinance"],
    ["Erste Verordnung zur Durchführung des Beispielgesetzes", "ordinance"],
    // A "-ordnung" is a statute (Insolvenzordnung) or an ordinance (Straßenverkehrs-Ordnung): the title alone does not say.
    ["Insolvenzordnung", "other"],
    ["Organisationserlaß des Bundeskanzlers", "decree"],
    ["Geschäftsordnung der Bundesregierung", "regulation"],
    ["Anordnung über die Beispielfrage", "decree"],
    ["Beispielwesen im Bund", "other"],
  ])("%s is %s", (title, kind) => {
    expect(kindOfTitle(title)).toBe(kind);
  });
});

describe("an act's address", () => {
  it("names the act by the folder its zip is served from", () => {
    expect(abbrOfLink("http://www.gesetze-im-internet.de/bgb/xml.zip")).toBe("bgb");
    expect(abbrOfLink("https://www.gesetze-im-internet.de/1-dm-goldm_nzg/xml.zip")).toBe(
      "1-dm-goldm_nzg",
    );
    expect(abbrOfLink("https://www.gesetze-im-internet.de/bgb/index.html")).toBeNull();
  });
});

describe("anchors", () => {
  it.each([
    ["§ 12", "par_12"],
    ["§ 12a", "par_12a"],
    ["§ 12 a", "par_12a"],
    ["§§ 3 bis 5", "par_3_bis_5"],
    ["Art 3", "art_3"],
    ["Art 1a", "art_1a"],
    ["Anlage", "anlage"],
    ["Anlage 2 (zu § 5)", "anlage_2"],
    ["Anhang EV", "anhang_ev"],
    ["Eingangsformel", "eingangsformel"],
    ["Präambel", "praeambel"],
  ])("%s → %s", (label, path) => {
    expect(anchorOf(label)).toBe(path);
  });

  it("is null for nothing", () => {
    expect(anchorOf("")).toBeNull();
    expect(anchorOf(" (zu § 5) ")).toBeNull();
  });
});

describe("an act's text", () => {
  const xml = fixture("gii-gg-excerpt.fixture.xml");
  const provisions = parseGiiXml(xml);
  const at = (path: string) => provisions.find((p) => p.path === path);

  it("cuts the norms that have words, in order, under their anchors", () => {
    expect(provisions.map((p) => p.path)).toEqual([
      "eingangsformel",
      "art_1",
      "art_7a",
      "art_12a",
      "art_143",
      "anlage_1",
      "anlage",
      "anlage-2",
    ]);
  });

  it("leaves out the act's own metadata and the portal's table of contents", () => {
    expect(provisions.some((p) => /Grundrechte$/.test(p.text))).toBe(false);
    expect(provisions.some((p) => p.heading.startsWith("Inhalt"))).toBe(false);
  });

  it("heads a provision with its number and its title", () => {
    expect(at("art_1")!.heading).toBe("Art 1 Menschenwürde – Grundrechtsbindung");
    expect(at("art_12a")!.heading).toBe("Art 12a");
    expect(at("eingangsformel")!.heading).toBe("Eingangsformel");
  });

  it("takes the text from the paragraphs, one line each", () => {
    expect(at("art_1")!.text.split("\n")).toEqual([
      "(1) Die Würde des Menschen ist unantastbar. Sie zu achten und zu schützen ist Verpflichtung aller staatlichen Gewalt.",
      "(2) Das Deutsche Volk bekennt sich darum zu unverletzlichen und unveräußerlichen Menschenrechten als Grundlage jeder menschlichen Gemeinschaft, des Friedens und der Gerechtigkeit in der Welt.",
      "(3) Die nachfolgenden Grundrechte binden Gesetzgebung, vollziehende Gewalt und Rechtsprechung als unmittelbar geltendes Recht.",
    ]);
  });

  it("keeps a variant's letter (Art 12a), and a repealed article as the portal prints it", () => {
    expect(at("art_12a")!.text).toMatch(/^\(1\) Männer können vom vollendeten achtzehnten/);
    expect(at("art_143")!.text).toBe("(weggefallen)");
  });

  it("puts a list item's number and text on one line, nested items under it, and drops footnote marks and notes", () => {
    expect(at("art_7a")!.text.split("\n")).toEqual([
      "Es gelten folgende Fälle:",
      "1. der erste Fall;",
      "2. der zweite Fall, wenn",
      "a) die Fläche 20² m² überschreitet und",
      "b) die Frist & die Form gewahrt sind.",
    ]);
    expect(at("art_7a")!.text).not.toMatch(/Fußnote|Zur Anwendung/);
  });

  it("reads an annex as a provision, a table row on a line with its cells apart", () => {
    expect(at("anlage_1")!.heading).toBe("Anlage 1 (zu Art 7a) Beispieltabelle");
    expect(at("anlage_1")!.text.split("\n")).toEqual([
      "Die Beträge ergeben sich aus der Tabelle:",
      "Stufe | Betrag in Euro",
      "1 | 100",
      "2 | 250",
    ]);
  });

  it("gives a repeated number its own path, and reads a CDATA text with its line breaks", () => {
    expect(at("anlage")!.text).toBe("Eine zweite Anlage ohne Nummer.");
    expect(at("anlage-2")!.text).toBe("Eine Anlage im CDATA-Abschnitt.\nZeile 1\nZeile 2");
  });

  it("states the act's abbreviation and long title", () => {
    expect(metadataOf(xml)).toEqual({
      jurabk: "GG",
      title: "Grundgesetz für die Bundesrepublik Deutschland",
    });
  });

  it("knows an act's XML from an error page", () => {
    expect(isGiiXml(xml)).toBe(true);
    expect(isGiiXml("<html><body>Not found</body></html>")).toBe(false);
  });

  it("keeps a note the act's first norm carries, as `vorspann`", () => {
    const note = parseGiiXml(
      '<dokumente><norm><metadaten><jurabk>X</jurabk><langue>Gesetz</langue></metadaten><textdaten><text format="XML"><Content><P>Dieses Gesetz dient der Umsetzung der Richtlinie.</P></Content></text></textdaten></norm></dokumente>',
    );
    expect(note).toEqual([
      { path: "vorspann", heading: "", text: "Dieses Gesetz dient der Umsetzung der Richtlinie." },
    ]);
  });

  it("reads nothing from an act whose norms have no words", () => {
    expect(
      parseGiiXml("<dokumente><norm><metadaten><jurabk>X</jurabk></metadaten></norm></dokumente>"),
    ).toEqual([]);
  });
});

describe("giiText", () => {
  it("turns a superscript digit into one and decodes entities", () => {
    expect(giiText("<P>§ 20<SUP>1</SUP> &amp; &#167; 3 &sect; 4</P>")).toBe("§ 20¹ & § 3 § 4");
  });
});

describe("the portal's zip", () => {
  const xml = new TextEncoder().encode(fixture("gii-gg-excerpt.fixture.xml"));

  it("holds the act's XML, found beside an image", () => {
    const zip = zipSync({
      "BJNR000010949.xml": xml,
      "bild.gif": new Uint8Array([71, 73, 70]),
    });
    expect(isZip(zip)).toBe(true);
    expect(new TextDecoder().decode(xmlOfZip(zip))).toContain("<dokumente");
  });

  it("is told from a page served in its place, and from a zip without XML", () => {
    expect(isZip(new TextEncoder().encode("<html>"))).toBe(false);
    expect(() => xmlOfZip(zipSync({ "bild.gif": new Uint8Array([1]) }))).toThrow(
      "no XML in the zip",
    );
  });
});
