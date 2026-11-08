import { describe, expect, it } from "vitest";
import {
  actsOfPage,
  inForceFromXml,
  listInForce,
  parseRiigiTeatajaXml,
  searchBody,
} from "../riigiteataja";

/** An excerpt of the Income Tax Act's XML as Riigi Teataja serves it (2026-11-07). */
const XML = `<?xml version='1.0' encoding='UTF-8'?><oigusakt xmlns="Juurakt">
<metaandmed><kehtivus><kehtivuseAlgus>2026-10-01+03:00</kehtivuseAlgus></kehtivus></metaandmed>
<sisu>
<paragrahv id="para4">
  <paragrahvNr>4</paragrahvNr>
  <kuvatavNr><![CDATA[§ 4. ]]></kuvatavNr>
  <paragrahvPealkiri>Maksumäärad</paragrahvPealkiri>
  <loige id="para4lg1">
    <loigeNr>1</loigeNr>
    <kuvatavNr><![CDATA[(1)]]></kuvatavNr>
    <sisuTekst><tavatekst>Tulumaksu määr on 22%.</tavatekst></sisuTekst>
    <muutmismarge><avaldamismarge><RTosa>RT I</RTosa><aktViide>130062023107</aktViide></avaldamismarge><joustumine>2025-01-01</joustumine></muutmismarge>
  </loige>
  <loige id="para4lg2">
    <loigeNr>2</loigeNr>
    <kuvatavNr><![CDATA[(2)]]></kuvatavNr>
    <sisuTekst><tavatekst>Paragrahvi 20<sup>1</sup> lõikes 4 nimetatud tulu puhul on määr 10%.</tavatekst></sisuTekst>
  </loige>
  <loige id="para4lg3">
    <loigeNr>3</loigeNr>
    <kuvatavNr><![CDATA[(3)]]></kuvatavNr>
    <muutmismarge><tavatekst>Kehtetu - </tavatekst><avaldamismarge><aktViide>1</aktViide></avaldamismarge></muutmismarge>
  </loige>
</paragrahv>
<paragrahv id="para20b1">
  <paragrahvNr ylaIndeks="1">20</paragrahvNr>
  <kuvatavNr><![CDATA[§ 20<sup>1</sup>. ]]></kuvatavNr>
  <paragrahvPealkiri>Kohustuslik kogumispension</paragrahvPealkiri>
  <loige id="para20b1lg2">
    <kuvatavNr><![CDATA[(2)]]></kuvatavNr>
    <sisuTekst><tavatekst>Väljamaksena ei käsitata:</tavatekst></sisuTekst>
    <alampunkt id="para20b1lg2p1">
      <alampunktNr>1</alampunktNr>
      <kuvatavNr><![CDATA[1)]]></kuvatavNr>
      <sisuTekst><tavatekst>tagastusväärtust &amp; muud;</tavatekst></sisuTekst>
    </alampunkt>
  </loige>
</paragrahv>
<paragrahv id="para2">
  <paragrahvNr>2</paragrahvNr>
  <kuvatavNr><![CDATA[§ 2.]]></kuvatavNr>
  <loige id="para2lg1"><sisuTekst><tavatekst>Eesti riigi maa-ala on jagamatu tervik.</tavatekst></sisuTekst></loige>
</paragrahv>
</sisu></oigusakt>`;

describe("parseRiigiTeatajaXml", () => {
  const sections = parseRiigiTeatajaXml(XML);

  it("cuts an act into its sections, anchored as the gazette anchors them", () => {
    expect(sections.map((s) => [s.path, s.heading])).toEqual([
      ["para4", "§ 4. Maksumäärad"],
      ["para20b1", "§ 20¹. Kohustuslik kogumispension"],
      ["para2", "§ 2."],
    ]);
  });

  it("gives each subsection and point its own line, numbered as published, superscripts kept", () => {
    expect(sections[0]!.text).toBe(
      [
        "(1) Tulumaksu määr on 22%.",
        "(2) Paragrahvi 20¹ lõikes 4 nimetatud tulu puhul on määr 10%.",
        "(3) Kehtetu",
      ].join("\n"),
    );
    expect(sections[1]!.text).toBe("(2) Väljamaksena ei käsitata:\n1) tagastusväärtust & muud;");
  });

  it("leaves the notes of which act amended what out of the text", () => {
    expect(sections.map((s) => s.text).join("\n")).not.toMatch(/RT I|130062023107|2025-01-01/);
  });

  it("reads a subsection with no number of its own", () => {
    expect(sections[2]!.text).toBe("Eesti riigi maa-ala on jagamatu tervik.");
  });

  it("reads the day the version took effect, as the publisher states it", () => {
    expect(inForceFromXml(XML)).toBe("2026-10-01");
  });
});

describe("the register", () => {
  it("asks for every consolidated text in force on a day, from an offset", () => {
    const body = JSON.parse(searchBody("2026-11-07", 60));
    expect(body.general.searchAfter).toBe(60);
    expect(body.precise).toMatchObject({
      status: "KEHTIVAD_KEHTETUTETA",
      validDate: "2026-11-07T00:00:00.000+00:00",
    });
  });

  it("reads a page of results as acts, dated by the calendar day they took effect", () => {
    expect(
      actsOfPage({
        kehtivad: 1,
        results: [
          {
            id: 109072026066,
            groupId: 161969,
            title: "Tulumaksuseadus",
            abbreviation: "TuMS",
            reportType: "seadus",
            reportIssuer: "Riigikogu",
            reportDateStart: "2026-10-01T00:00:00+03:00",
            localGovernment: false,
          },
        ],
      }),
    ).toEqual([
      {
        id: "109072026066",
        groupId: "161969",
        title: "Tulumaksuseadus",
        abbreviation: "TuMS",
        type: "seadus",
        issuer: "Riigikogu",
        inForceFrom: "2026-10-01",
        local: false,
      },
    ]);
  });
});

/** A government regulation laid out without sections, as the gazette serves one (2026-11-07). */
const UNSECTIONED = `<?xml version='1.0' encoding='UTF-8'?><oigusakt xmlns="Juurakt"><sisu>
<preambul><tavatekst>Tulenevalt </tavatekst><viide><kuvatavTekst><![CDATA[eluruumide erastamise seaduse]]></kuvatavTekst><viideURID><viideURI><![CDATA[./dyn=13351854&id=893050!pr9lg2]]></viideURI></viideURID></viide><tavatekst> paragrahvi 9 lõikest 2 Vabariigi Valitsus määrab:</tavatekst></preambul>
<sisuTekst><tavatekst>Kinnitada «Eluruumi erastamise kord» (juurde lisatud).</tavatekst></sisuTekst>
<sisuTekst><HTMLKonteiner><![CDATA[<table><tr><td>Kinnitatud<br/>määrusega nr 188</td></tr></table>]]></HTMLKonteiner></sisuTekst>
<osa id="osa1"><osaNr>I</osaNr><kuvatavNr><![CDATA[I osa]]></kuvatavNr><osaPealkiri>ÜLDSÄTTED</osaPealkiri></osa>
<sisuTekst><tavatekst>1. Käesoleva korra kohaselt korraldatakse enampakkumisi.</tavatekst></sisuTekst>
</sisu></oigusakt>`;

describe("an act without sections", () => {
  it("is its preamble and its text, in order, with the gazette's link targets left out", () => {
    expect(parseRiigiTeatajaXml(UNSECTIONED)).toEqual([
      {
        path: "preambul",
        heading: "Preambul",
        text: "Tulenevalt eluruumide erastamise seaduse paragrahvi 9 lõikest 2 Vabariigi Valitsus määrab:",
      },
      {
        path: "tekst",
        heading: "Tekst",
        text: [
          "Kinnitada «Eluruumi erastamise kord» (juurde lisatud).",
          "Kinnitatud",
          "määrusega nr 188",
          "I osa ÜLDSÄTTED",
          "1. Käesoleva korra kohaselt korraldatakse enampakkumisi.",
        ].join("\n"),
      },
    ]);
  });
});

describe("two sections with one id", () => {
  it("keeps both, the second found under its own path", () => {
    const xml = `<oigusakt><paragrahv id="para1"><kuvatavNr><![CDATA[§ 1.]]></kuvatavNr><loige><sisuTekst><tavatekst>Esimene.</tavatekst></sisuTekst></loige></paragrahv><paragrahv id="para1"><kuvatavNr><![CDATA[§ 1.]]></kuvatavNr><loige><sisuTekst><tavatekst>Teine.</tavatekst></sisuTekst></loige></paragrahv></oigusakt>`;
    expect(parseRiigiTeatajaXml(xml).map((p) => [p.path, p.text])).toEqual([
      ["para1", "Esimene."],
      ["para1-2", "Teine."],
    ]);
  });
});

describe("a register whose pages are not stable", () => {
  it("lists every act once, reading again for the acts a pass skipped", async () => {
    const result = (id: number) => ({
      id,
      groupId: id + 1000,
      title: "Kaitseväe kasutamine",
      abbreviation: null,
      reportType: "otsus",
      reportIssuer: "Riigikogu",
      reportDateStart: "2026-01-01T00:00:00+02:00",
      localGovernment: false,
    });
    // The first pass shows act 2 twice and never act 3; the second shows all three.
    const passes = [
      [[1, 2], [2]],
      [[1, 2], [3]],
    ];
    let calls = 0;
    const doFetch: typeof fetch = async (_input, init) => {
      const offset = JSON.parse(String(init?.body)).general.searchAfter as number;
      const pass = passes[Math.min(Math.floor(calls++ / 2), 1)]!;
      const ids = pass[offset === 0 ? 0 : 1]!;
      return Response.json({ kehtivad: 3, results: ids.map(result) });
    };
    const acts = await listInForce("2026-11-08", doFetch, { pauseMs: 0 });
    expect(acts.map((a) => a.id)).toEqual(["1", "2", "3"]);
    expect(calls).toBe(4);
  });
});
