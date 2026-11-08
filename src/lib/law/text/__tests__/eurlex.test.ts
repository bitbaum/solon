/**
 * The European Union's reader on excerpts of what Cellar and EUR-Lex answer.
 * Neither host could be reached from the sandbox this reader was written in
 * (2026-11-08), so the excerpts are the acts' own words in the publishers'
 * documented shapes (SPARQL 1.1 JSON results as Virtuoso writes them; EUR-Lex's
 * HTML for an act as published and for a consolidated version), not captures.
 * The server's dry run (`law:text eurlex --year 2016 --limit 20 --dry-run`) is
 * the check against the live pages.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  actsOfRows,
  consolidatedQuery,
  consolidationOf,
  inForceQuery,
  isActPage,
  latestConsolidations,
  listInForce,
  parseEurLexHtml,
} from "../eurlex";

const fixture = (name: string) => readFileSync(join(__dirname, "fixtures", name), "utf8");
const bindings = (name: string) => JSON.parse(fixture(name)).results.bindings;

describe("the register of EU acts in force", () => {
  it("asks for one year's regulations and directives in force, never a sorted page past what Cellar will sort", () => {
    const q = inForceQuery(2016, 5000);
    expect(q).toContain('REGEX(STR(?celex), "^32016[RL][0-9]{4}$")');
    expect(q).toContain("cdm:resource_legal_in-force");
    expect(q).toContain("/language/ENG>");
    expect(q).toContain("LIMIT 5000 OFFSET 5000");
    expect(consolidatedQuery(2016, 0)).toContain('"^02016[RL][0-9]{4}-[0-9]{8}$"');
  });

  it("reads each act once, titled in English, dated by its entry into force", () => {
    const { acts, skipped } = actsOfRows(bindings("eurlex-inforce-2016.fixture.json"));
    expect(skipped).toEqual([]);
    expect(acts).toEqual([
      expect.objectContaining({ celex: "32016L0680", type: "L", inForceFrom: "2016-05-05" }),
      expect.objectContaining({ celex: "32016R0679", type: "R", inForceFrom: "2016-05-24" }),
    ]);
    expect(acts[1]!.title).toMatch(
      /^Regulation \(EU\) 2016\/679 .*\(General Data Protection Regulation\)/,
    );
  });

  it("keeps the earliest entry into force and the first title, and says why an act is left out", () => {
    const v = (value: string) => ({ value });
    const { acts, skipped } = actsOfRows([
      {
        celex: v("32020R0001"),
        title: v("A#title"),
        force: v("2020-03-01"),
        date: v("2020-01-01"),
      },
      { celex: v("32020R0001"), title: v("Another"), force: v("2020-02-01") },
      { celex: v("32020R0002"), date: v("2020-01-01") },
      { celex: v("32020R0003"), title: v("No date") },
      { celex: v("32020R0004"), title: v("Only the document's day"), date: v("2020-01-09") },
    ]);
    expect(acts.map((a) => [a.celex, a.title, a.inForceFrom])).toEqual([
      ["32020R0001", "A title", "2020-02-01"],
      ["32020R0004", "Only the document's day", "2020-01-09"],
    ]);
    expect(skipped).toEqual([
      { celex: "32020R0002", reason: "no English title" },
      { celex: "32020R0003", reason: "no date" },
    ]);
  });

  it("reads a consolidated version's act and day from its CELEX number, and picks the latest begun", () => {
    expect(consolidationOf("02016R0679-20160504")).toEqual({
      act: "32016R0679",
      date: "2016-05-04",
    });
    expect(consolidationOf("32016R0679")).toBeNull();
    const latest = latestConsolidations(
      ["02013R0575-20240709", "02013R0575-20250101", "02013R0575-20270101"],
      "2026-11-08",
    );
    expect(latest.get("32013R0575")).toEqual({ celex: "02013R0575-20250101", date: "2025-01-01" });
  });

  it("lists a year: the GDPR read in its consolidated version, the directive as published", async () => {
    const asked: string[] = [];
    const cellar: typeof fetch = async (_url, init) => {
      const query = new URLSearchParams(String(init?.body)).get("query")!;
      asked.push(query);
      const file = query.includes("in-force")
        ? "eurlex-inforce-2016.fixture.json"
        : "eurlex-consolidated-2016.fixture.json";
      return new Response(fixture(file), {
        headers: { "content-type": "application/sparql-results+json" },
      });
    };
    const { acts } = await listInForce(cellar, { today: "2026-11-08", years: [2016], pauseMs: 0 });
    expect(asked).toHaveLength(2);
    expect(acts.map((a) => [a.celex, a.text])).toEqual([
      ["32016L0680", { celex: "32016L0680", date: "2016-05-05", consolidated: false }],
      ["32016R0679", { celex: "02016R0679-20160504", date: "2016-05-04", consolidated: true }],
    ]);
  });
});

describe("an EU act's text from EUR-Lex", () => {
  it("cuts an act as published into its preamble and articles under EUR-Lex's anchors", () => {
    const html = fixture("eurlex-32016R0679-oj.fixture.html");
    expect(isActPage(html)).toBe(true);
    const provisions = parseEurLexHtml(html);
    expect(provisions.map((p) => p.path)).toEqual(["pbl_1", "art_1", "art_6"]);
    expect(provisions[0]!.text).toContain(
      "(1) The protection of natural persons in relation to the processing of personal data is a fundamental right. Article 8(1) of the Charter of Fundamental Rights of the European Union (the ‘Charter’)",
    );
    expect(provisions[1]).toEqual({
      path: "art_1",
      heading: "Article 1 Subject-matter and objectives",
      text: [
        "1. This Regulation lays down rules relating to the protection of natural persons with regard to the processing of personal data and rules relating to the free movement of personal data.",
        "2. This Regulation protects fundamental rights and freedoms of natural persons and in particular their right to the protection of personal data.",
        "3. The free movement of personal data within the Union shall be neither restricted nor prohibited for reasons connected with the protection of natural persons with regard to the processing of personal data.",
      ].join("\n"),
    });
    expect(provisions[2]!.heading).toBe("Article 6 Lawfulness of processing");
    expect(provisions[2]!.text.split("\n")).toEqual([
      "1. Processing shall be lawful only if and to the extent that at least one of the following applies:",
      "(a) the data subject has given consent to the processing of his or her personal data for one or more specific purposes;",
      "(b) processing is necessary for the performance of a contract to which the data subject is party or in order to take steps at the request of the data subject prior to entering into a contract;",
    ]);
  });

  it("cuts an annex under its anchor, a point within a point on a line of its own", () => {
    const provisions = parseEurLexHtml(fixture("eurlex-32015L2366-oj.fixture.html"));
    expect(provisions.map((p) => [p.path, p.heading])).toEqual([
      ["art_1", "Article 1 Subject matter"],
      ["anx_I", "ANNEX I PAYMENT SERVICES (as referred to in point (3) of Article 4)"],
    ]);
    expect(provisions[1]!.text.split("\n")).toEqual([
      "1. Services enabling cash to be placed on a payment account as well as all the operations required for operating a payment account.",
      "2. Services enabling cash withdrawals from a payment account as well as all the operations required for operating a payment account.",
      "3. Execution of payment transactions, including transfers of funds on a payment account with the user’s payment service provider or with another payment service provider:",
      "(a) execution of direct debits, including one-off direct debits;",
      "(b) execution of payment transactions through a payment card or a similar device;",
    ]);
  });

  it("cuts a consolidated version, leaving out the amendment marks", () => {
    const provisions = parseEurLexHtml(fixture("eurlex-02016R0679-20160504.fixture.html"));
    expect(provisions.map((p) => [p.path, p.heading])).toEqual([
      ["art_1", "Article 1 Subject-matter and objectives"],
      ["art_2", "Article 2 Material scope"],
    ]);
    expect(provisions[0]!.text.split("\n")[0]).toBe(
      "1. This Regulation lays down rules relating to the protection of natural persons with regard to the processing of personal data and rules relating to the free movement of personal data.",
    );
    expect(provisions[1]!.text.split("\n")).toEqual([
      "1. This Regulation applies to the processing of personal data wholly or partly by automated means and to the processing other than by automated means of personal data which form part of a filing system or are intended to form part of a filing system.",
      "2. This Regulation does not apply to the processing of personal data:",
      "(a) in the course of an activity which falls outside the scope of Union law;",
      "(b) by the Member States when carrying out activities which fall within the scope of Chapter 2 of Title V of the TEU;",
    ]);
    expect(provisions.some((p) => /[▼►◄]/.test(p.text + p.heading))).toBe(false);
  });

  it("cuts an older act on its article headings, under the anchors EUR-Lex gives newer ones", () => {
    // Council Directive 93/13/EEC on unfair terms in consumer contracts, in the layout of acts
    // published before the ELI's anchors.
    const html = `<html><body><div id="TexteOnly"><TXT_TE>
<p class="ti-art">Article 1</p>
<p class="normal">1. The purpose of this Directive is to approximate the laws, regulations and administrative provisions of the Member States relating to unfair terms in contracts concluded between a seller or supplier and a consumer.</p>
<p class="ti-art">Article 2</p>
<p class="normal">For the purposes of this Directive:</p>
<p class="doc-ti">ANNEX</p>
<p class="normal">TERMS REFERRED TO IN ARTICLE 3 (3)</p>
</TXT_TE></div></body></html>`;
    expect(isActPage(html)).toBe(true);
    expect(parseEurLexHtml(html)).toEqual([
      {
        path: "art_1",
        heading: "Article 1",
        text: "1. The purpose of this Directive is to approximate the laws, regulations and administrative provisions of the Member States relating to unfair terms in contracts concluded between a seller or supplier and a consumer.",
      },
      { path: "art_2", heading: "Article 2", text: "For the purposes of this Directive:" },
      { path: "anx_1", heading: "ANNEX", text: "TERMS REFERRED TO IN ARTICLE 3 (3)" },
    ]);
  });

  it("keeps an act laid out in neither way as one provision, and knows an error page is not an act", () => {
    expect(parseEurLexHtml("<html><body><p>Decision text.</p></body></html>")).toEqual([
      { path: "text", heading: "", text: "Decision text." },
    ]);
    expect(
      isActPage("<html><body><p>The requested document does not exist.</p></body></html>"),
    ).toBe(false);
  });
});

describe("an act published before EUR-Lex marked anything", () => {
  // The layout of acts before 2004: plain paragraphs, each article number alone in one.
  const html = `<html><body><div id="TexteOnly"><p>COMMISSION REGULATION (EC) No 903/95</p>
<p>THE COMMISSION OF THE EUROPEAN COMMUNITIES,</p><p>Having regard to the Treaty,</p><p>HAS ADOPTED THIS REGULATION:</p>
<p>Article 1</p><p>The amounts are fixed in the Annex.</p>
<p>Article 2</p><p>This Regulation shall enter into force on the day of its publication.</p><p>It refers to Article 1 of Regulation (EEC) No 1766/92.</p>
<p>ANNEX</p><p>Amounts in ECU per tonne.</p></div></body></html>`;

  it("is cut on its article numbers, with the preamble before them and the annex after", () => {
    expect(parseEurLexHtml(html).map((p) => [p.path, p.heading])).toEqual([
      ["pbl_1", "Preamble"],
      ["art_1", "Article 1"],
      ["art_2", "Article 2"],
      ["anx_1", "ANNEX"],
    ]);
  });

  it("keeps a sentence that only mentions an article inside the article it belongs to", () => {
    const art2 = parseEurLexHtml(html).find((p) => p.path === "art_2")!;
    expect(art2.text).toContain("It refers to Article 1 of Regulation (EEC) No 1766/92.");
  });
});
