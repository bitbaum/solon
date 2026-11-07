import { describe, expect, it } from "vitest";
import { actsOfPage, inForceFromXml, parseRiigiTeatajaXml, searchBody } from "../riigiteataja";

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
