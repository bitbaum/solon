import { describe, expect, it } from "vitest";
import { actsOf, anchorsOf, versionOf } from "../linked-documents";

const config = {
  link: /\/download_file\/(?:view\/|force\/)?([0-9a-f-]{1,40})(?:[/?#]|$)/i,
  include: /reglement|ordnung|tarif/i,
  exclude: /antrag|formular/i,
};

describe("a commune's acts, as linked from its own pages", () => {
  const html = `
    <a href="https://www.schaan.li/download_file/force/33607/288"><svg><path d="M1"/></svg> Vereinsreglement </a>
    <a href="/download_file/view/98" target="_blank">Kundmachungs&shy;reglement.pdf</a>
    <a href="/download_file/view/98">Kundmachungsreglement (again)</a>
    <a href="/download_file/view/172">Antrag Reglement Beiträge</a>
    <a href="/download_file/view/97">Formular Anfrage Personendaten</a>
    <a href="/gemeinde/kontakt">Kontakt</a>
    <a href="/download_file/view/df9e8feb-1f9c-499e-a060-fb32a629f268">Tarifblatt zum Abwasserreglement (gültig ab 01.01.2027)</a>`;

  it("titles each act by its link, once per document, and leaves forms out", () => {
    const acts = actsOf(anchorsOf(html, "https://www.planken.li/service/"), config);
    expect(acts.map((a) => [a.ref, a.title])).toEqual([
      ["33607", "Vereinsreglement"],
      ["98", "Kundmachungsreglement"],
      [
        "df9e8feb-1f9c-499e-a060-fb32a629f268",
        "Tarifblatt zum Abwasserreglement (gültig ab 01.01.2027)",
      ],
    ]);
    expect(acts[1]!.pageUrl).toBe("https://www.planken.li/download_file/view/98");
    expect(acts.every((a) => a.kind === "communal_act")).toBe(true);
  });

  it("dates a version by the title's 'gültig ab', else by the day it is read", () => {
    expect(versionOf("Tarifordnung (gültig ab 01.01.2027)", "u", "2026-11-01")).toEqual({
      inForceFrom: "2027-01-01",
      inForceTo: null,
      pageUrl: "u",
    });
    expect(versionOf("Tarifblatt (gültig bis 31.12.2026)", "u", "2026-11-01")).toEqual({
      inForceFrom: "2026-11-01",
      inForceTo: null,
      pageUrl: "u",
      dateBasis: "retrieved",
    });
  });
});

describe("a download button's words", () => {
  it("are not part of the act's title", () => {
    const [a] = anchorsOf(
      '<a href="https://www.eschen.li/wp-content/uploads/2022/10/Abwasserreglement-2013.pdf"><span>Abwasserreglement</span> als PDF herunterladen</a>',
      "https://www.eschen.li/",
    );
    expect(a!.text).toBe("Abwasserreglement");
  });
});

describe("an act's address", () => {
  it("drops the cache-buster a page adds on every visit", () => {
    const acts = actsOf(
      anchorsOf(
        '<a href="https://www.ruggell.li/files/medienarchiv/029_Abfallreglement.pdf?t=639291088808965558">029 Abfallreglement</a>',
        "https://www.ruggell.li/",
      ),
      { link: /\/files\/medienarchiv\/([^/?#]+\.pdf)/, include: /reglement/i, exclude: /antrag/i },
    );
    expect(acts[0]!.pageUrl).toBe(
      "https://www.ruggell.li/files/medienarchiv/029_Abfallreglement.pdf",
    );
  });
});

describe("a link whose words are only a button's", () => {
  it("is named by its title, else its file, and an act offered twice is listed once", () => {
    const html = `
      <a href="files/attachments/3-1-abwasserreglement.pdf" title="Dokument herunterladen">Dokument herunterladen</a>
      <a href="files/attachments/2-1-bauordnung-anhang-zu-bauunterlagen.pdf" title="Bauordnung"></a>
      <a href="files/attachments/7-1-reglement-sport-und-freizeitanlage.pdf" title="Reglement"></a>
      <a href="files/attachments/tarifordnung.pdf">Tarifordnung &#xFC;ber die Wasseranschlussgeb&#xFC;hr</a>
      <a href="files/attachments/6-friedhofordnung.pdf" title="Friedhofordnung"></a>
      <a href="files/attachments/friedhofordnung-2.pdf" title="Friedhofordnung"></a>`;
    const acts = actsOf(anchorsOf(html, "https://www.schellenberg.li/service/"), {
      link: /\/files\/attachments\/([^/?#]+\.pdf)/,
      include: /reglement|ordnung/i,
      exclude: /antrag/i,
    });
    expect(acts.map((a) => a.title)).toEqual([
      "Abwasserreglement",
      "Bauordnung",
      "Reglement sport und freizeitanlage",
      "Tarifordnung über die Wasseranschlussgebühr",
      "Friedhofordnung",
    ]);
  });
});

describe("a page that declares its own base", () => {
  it("resolves relative links against it, not the page's address", () => {
    const [a] = anchorsOf(
      '<html><head><base href="/"></head><body><a href="files/attachments/reglement-gemeindepolizei.pdf">Reglement Gemeindepolizei</a></body></html>',
      "https://www.schellenberg.li/service",
    );
    expect(a!.href).toBe(
      "https://www.schellenberg.li/files/attachments/reglement-gemeindepolizei.pdf",
    );
  });
});

describe("an empty link laid over a whole row", () => {
  it("is named by its label for screen readers, without the button's words", () => {
    const [a] = anchorsOf(
      '<a class="serviceportalrow__overlay" href="/files/07_Friedhofordnung_2017_03_28.pdf" target="_blank" aria-label="Friedhofordnung herunterladen (&#xF6;ffnet neues Fenster)"></a>',
      "https://www.triesen.li/service-portal/online-schalter",
    );
    expect(a).toEqual({
      href: "https://www.triesen.li/files/07_Friedhofordnung_2017_03_28.pdf",
      text: "Friedhofordnung",
    });
  });
});

describe("Liechtenstein's communes", () => {
  it("each read into the commune its number names in the register", async () => {
    const { PUBLISHERS } = await import("../index");
    const { LAW_AUTHORITIES } = await import("@/lib/config/law");
    const communes = await import("../linked-documents");
    for (const [key, number, name] of [
      ["vaduz", "7001", "Vaduz"],
      ["triesen", "7002", "Triesen"],
      ["balzers", "7003", "Balzers"],
      ["triesenberg", "7004", "Triesenberg"],
      ["schaan", "7005", "Schaan"],
      ["planken", "7006", "Planken"],
      ["eschen", "7007", "Eschen"],
      ["mauren", "7008", "Mauren"],
      ["gamprin", "7009", "Gamprin"],
      ["ruggell", "7010", "Ruggell"],
      ["schellenberg", "7011", "Schellenberg"],
    ] as const) {
      const publisher = communes[key];
      expect(PUBLISHERS[key]).toBe(publisher);
      const authority = LAW_AUTHORITIES.find((a) => a.key === publisher.authority)!;
      expect(authority.place).toEqual({ scheme: "li_municipality", value: number });
      expect(authority.name).toContain(name);
    }
  });
});

describe("Swiss communes that link their acts from one page", () => {
  // The documents' addresses are the communes' own, as search engines index them (2026-11-08).
  const page = async (
    key: "koeniz" | "fribourgCity" | "neuchatelCity" | "luganoCity" | "bellinzonaCity",
    html: string,
    base: string,
  ) => {
    const communes = await import("../linked-documents");
    const listed = await communes[key].list(
      (async () => new Response(html)) as unknown as typeof fetch,
    );
    expect(listed.url).toBe(base);
    return listed.acts;
  };

  it("Köniz: its acts by asset number, without the ones not yet in force or repealed", async () => {
    const acts = await page(
      "koeniz",
      `<a href="/public/upload/assets/13982/152.04_datenschutzreglement.pdf?fp=2">152.04 Datenschutzreglement</a>
       <a href="/public/upload/assets/12119/725.11_reglement_ausfuehrungs_gebuehrenbestimmungen_baureglement.pdf?fp=3">725.11 Reglement über Ausführungs- und Gebührenbestimmungen zum Baureglement</a>
       <a href="/public/upload/assets/23719/153.01_Personalreglement_haengig.pdf?fp=2">153.01 Personalreglement</a>
       <a href="/public/upload/assets/18127/721.0_baureglement_besondere_vorschriften_nutzungsplan_schutzplan_AUFGEHOBEN.pdf?fp=2">721.0 Baureglement</a>
       <a href="/public/upload/assets/14177/180413_opr_erlaeuterungsversion_baureglement.pdf?fp=1">Baureglement, Erläuterungsversion</a>`,
      "https://www.koeniz.ch/verwaltung/reglementeverordnungen.page/952",
    );
    expect(acts.map((a) => [a.ref, a.title])).toEqual([
      ["13982", "152.04 Datenschutzreglement"],
      ["12119", "725.11 Reglement über Ausführungs- und Gebührenbestimmungen zum Baureglement"],
    ]);
  });

  it("Fribourg: its acts in the monthly upload folders, in French, without the council's messages", async () => {
    const acts = await page(
      "fribourgCity",
      `<a href="/sites/default/files/2020-10/600.1_reglement_des_dechets_1998_2011.pdf">600.1 Règlement relatif à la gestion des déchets</a>
       <a href="/sites/default/files/2026-07/101.2_reglement_new.pdf">101.2 Règlement d'application</a>
       <a href="/sites/default/files/inline-files/Message51_Rdesfinances.pdf">Message n° 51 : règlement des finances</a>`,
      "https://www.ville-fribourg.ch/reglements-tarifs",
    );
    expect(acts.map((a) => a.ref)).toEqual([
      "2020-10/600.1_reglement_des_dechets_1998_2011.pdf",
      "2026-07/101.2_reglement_new.pdf",
    ]);
    const { fribourgCity } = await import("../linked-documents");
    expect(fribourgCity.locale).toBe("fr");
  });

  it("Neuchâtel: its acts, without the tables of contents or the former collection's copies", async () => {
    const dir = "/fileadmin/sites/ne_ville/fichiers/votre_commune/reglementation";
    const acts = await page(
      "neuchatelCity",
      `<a href="${dir}/Reglementation_2021/100_CG_Reglement_general_de_la_Ville_de_Neuchatel_Juin_2022.pdf">100.1 Règlement général de la Ville de Neuchâtel</a>
       <a href="${dir}/12_2_R_police.pdf">12.2 Règlement de police</a>
       <a href="${dir}/Reglementation_2021/VdN_Table_chronologique_Mai_2026.pdf">Table chronologique</a>
       <a href="${dir}/Tabmat_1_8_novembre_2020.pdf">Recueil systématique, table des matières</a>
       <a href="${dir}/imported/Preface.pdf">Préface</a>`,
      "https://www.neuchatelville.ch/votre-commune/reglementation",
    );
    expect(acts.map((a) => a.title)).toEqual([
      "100.1 Règlement général de la Ville de Neuchâtel",
      "12.2 Règlement de police",
    ]);
  });

  it("Lugano: each act a page of the city's that serves its PDF, read in Italian", async () => {
    const acts = await page(
      "luganoCity",
      `<a href="https://www.lugano.ch/law/16371942/1-1-1-Regolamento-comunale-della-Citta-di-Lugano-del-14-marzo-1989">1.1.1 Regolamento comunale della Città di Lugano</a>
       <a href="/law/16174908/7-1-1-Regolamento-edilizio-della-Citta-di-Lugano-del-16-dicembre-1963">7.1.1 Regolamento edilizio della Città di Lugano</a>
       <a href="/dam/jcr:3c48f197-33fc-4265-89aa-0e96f104cf4c/MMN_11423.pdf">Messaggio municipale no. 11423</a>`,
      "https://www.lugano.ch/la-mia-citta/amministrazione/legislazione/",
    );
    expect(acts.map((a) => [a.ref, a.title])).toEqual([
      ["16371942", "1.1.1 Regolamento comunale della Città di Lugano"],
      ["16174908", "7.1.1 Regolamento edilizio della Città di Lugano"],
    ]);
  });

  it("Bellinzona: each act a file served by its document id", async () => {
    const acts = await page(
      "bellinzonaCity",
      `<a href="downdoc.php?id_doc=29818&amp;lng=1&amp;rif=552846a154">Regolamento comunale sull'occupazione di area pubblica</a>
       <a href="/downdoc.php?id_doc=79595&amp;lng=1&amp;i=1&amp;rif=c1fdc5a2e6">Ordinanza municipale sugli impianti pubblicitari</a>
       <a href="/Calendario-rifiuti-2026-Camorino-Claro-Gnosca-Gorduno-Moleno-Preonzo-4f523400">Calendario rifiuti 2026</a>`,
      "https://www.bellinzona.ch/1d212c00",
    );
    expect(acts.map((a) => [a.ref, a.pageUrl])).toEqual([
      ["29818", "https://www.bellinzona.ch/downdoc.php?id_doc=29818&lng=1&rif=552846a154"],
      ["79595", "https://www.bellinzona.ch/downdoc.php?id_doc=79595&lng=1&i=1&rif=c1fdc5a2e6"],
    ]);
  });

  it("each read into the commune its BFS number names, within its canton", async () => {
    const { PUBLISHERS } = await import("../index");
    const { LAW_AUTHORITIES } = await import("@/lib/config/law");
    for (const [key, number, canton] of [
      ["koeniz", "355", "be"],
      ["fribourg-city", "2196", "fr"],
      ["neuchatel-city", "6458", "ne"],
      ["lugano-city", "5192", "ti"],
      ["bellinzona-city", "5002", "ti"],
    ] as const) {
      const authority = LAW_AUTHORITIES.find((a) => a.key === PUBLISHERS[key]!.authority)!;
      expect(authority.place).toEqual({ scheme: "bfs_municipality", value: number });
      expect(authority.within).toBe(canton);
    }
  });
});
