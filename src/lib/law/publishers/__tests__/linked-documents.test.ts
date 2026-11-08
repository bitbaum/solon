import { describe, expect, it } from "vitest";
import {
  actsOf,
  anchorsOf,
  bellinzonaCity,
  fribourgCity,
  geneveCity,
  koeniz,
  lausanneCity,
  linkedDocuments,
  versionOf,
} from "../linked-documents";

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

  it("Fribourg: each act a page of its own, in French, without the theme filters or the council's messages", async () => {
    const acts = await page(
      "fribourgCity",
      `<a href="/reglements-tarifs/100-1">Règlement du Conseil général de la Ville de Fribourg</a>
       <a href="/reglements-tarifs?theme%5B0%5D=1035">Police</a>
       <a href="/reglements-tarifs/600-1">Règlement relatif à la gestion des déchets</a>
       <a href="/sites/default/files/inline-files/Message51_Rdesfinances.pdf">Message n° 51 : règlement des finances</a>`,
      "https://www.ville-fribourg.ch/reglements-tarifs",
    );
    expect(acts.map((a) => a.ref)).toEqual(["100-1", "600-1"]);
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

  it("Bellinzona: each act a page of the site's own, the merged communes' regulations included", async () => {
    const acts = await page(
      "bellinzonaCity",
      `<a href="https://www.bellinzona.ch/Regolamento-comunale-Citt-di-Bellinzona-4e93e800?i=1&amp;MasterId=g1_35058">Regolamento comunale Città di Bellinzona</a>
       <a href="https://www.bellinzona.ch/Camorino-Regolamento-sull-uso-dei-beni-comunali-51eb4900?i=1&amp;MasterId=g1_35063">Camorino - Regolamento sull'uso dei beni comunali</a>
       <a href="/Calendario-rifiuti-2026-Camorino-Claro-Gnosca-Gorduno-Moleno-Preonzo-4f523400">Calendario rifiuti 2026</a>`,
      "https://www.bellinzona.ch/1d212c00",
    );
    expect(acts.map((a) => a.ref)).toEqual([
      "Regolamento-comunale-Citt-di-Bellinzona-4e93e800",
      "Camorino-Regolamento-sull-uso-dei-beni-comunali-51eb4900",
    ]);
  });

  /** A site that answers from a map of addresses; anything else is not there. */
  const site = (pages: Record<string, string>) =>
    (async (input: string | URL) => {
      const body = pages[String(input)];
      return body === undefined ? new Response("", { status: 404 }) : new Response(body);
    }) as unknown as typeof fetch;

  it("Genève: each act a page of its own, listed across the list's pages, a missing page not stopping the rest", async () => {
    const { geneveCity } = await import("../linked-documents");
    const list =
      "https://www.geneve.ch/autorites-administration/administration-municipale/reglements-municipaux";
    const listed = await geneveCity.list(
      site({
        [list]: `<a href="/administration-municipale/reglements-municipaux/lc21111-reglement-conseil-municipal-ville-geneve">PDF 21111 - Règlement du Conseil municipal de la Ville de Genève</a>
          <a href="/autorites-administration/administration-municipale/reglements-municipaux?f%5B0%5D=categories%3A637">LC 21 100 - Autorités, administration et finances</a>`,
        [`${list}?page=1`]: `<a href="/administration-municipale/reglements-municipaux/lc21133-reglement-controle-interne">PDF 21133 - Règlement relatif au système de contrôle interne</a>`,
      }),
    );
    expect(listed.acts.map((a) => a.ref)).toEqual([
      "lc21111-reglement-conseil-municipal-ville-geneve",
      "lc21133-reglement-controle-interne",
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
      ["geneve-city", "6621", "ge"],
      ["lausanne-city", "5586", "vd"],
    ] as const) {
      const authority = LAW_AUTHORITIES.find((a) => a.key === PUBLISHERS[key]!.authority)!;
      expect(authority.place).toEqual({ scheme: "bfs_municipality", value: number });
      expect(authority.within).toBe(canton);
    }
  });
});

/** A stand-in for a city's site: every address answers with the same page. */
const site = (html: string) =>
  (async () =>
    new Response(html, { headers: { "content-type": "text/html" } })) as unknown as typeof fetch;

describe("Köniz: files named only by a size label", () => {
  const html = `
    <a href="/public/upload/assets/18008/101.1_Gemeindeordnung.pdf?fp=6">[pdf, 216 KB]</a>
    <a href="/public/upload/assets/14670/121.11_Verordnung_Einbuergerungsverfahren.pdf?fp=3">[pdf, 70 KB]</a>
    <a href="/public/upload/assets/1/200.1_Antrag_Formular.pdf">[pdf, 12 KB]</a>`;

  it("lists each act by its file's name, forms left out", async () => {
    const { acts } = await koeniz.list(site(html));
    expect(acts.map((a) => a.title)).toEqual([
      "Gemeindeordnung",
      "Verordnung Einbuergerungsverfahren",
    ]);
  });
});

describe("a download button in French or Italian", () => {
  it.each(["Télécharger le fichier", "Télécharger", "Scarica il file", "Scaricare"])(
    "%s names no act",
    (label) => {
      const [a] = anchorsOf(
        `<a href="/files/2024-05/Reglement-des-taxes.pdf">${label}</a>`,
        "https://www.example.ch/",
      );
      expect(a!.text).toBe("Reglement des taxes");
    },
  );
});

describe("Lausanne: a title link, then the act's download button", () => {
  const html = `
    <a href="#">100.1 – Règlement du Conseil communal de Lausanne</a>
    <a href="/apps/actualites/Next/serve.php?id=7&kind=recueil">Télécharger le fichier</a>
    <a href="#">101.1 – Règlement pour la Municipalité de Lausanne</a>
    <a href="/apps/actualites/Next/serve.php?id=176&kind=recueil">Télécharger le fichier</a>
    <a href="#">101.2 – Formulaire de demande de subvention</a>
    <a href="/apps/actualites/Next/serve.php?id=8&kind=recueil">Télécharger le fichier</a>`;

  it("takes each document's title from the numbered link before it, forms left out", async () => {
    const { acts } = await lausanneCity.list(site(html));
    expect(acts.map((a) => [a.ref, a.title])).toEqual([
      ["7", "100.1 – Règlement du Conseil communal de Lausanne"],
      ["176", "101.1 – Règlement pour la Municipalité de Lausanne"],
    ]);
  });
});

describe("cities whose acts are pages that link their file", () => {
  it("lists Fribourg's act pages, not its theme filters", async () => {
    const { acts } = await fribourgCity.list(
      site(
        '<a href="/reglements-tarifs/100-1">Règlement du Conseil général de la Ville de Fribourg</a><a href="/reglements-tarifs?theme%5B0%5D=1035">Police</a><a href="/reglements-tarifs/100-2">Règlement concernant les jetons de présence du Conseil général</a>',
      ),
    );
    expect(acts.map((a) => a.ref)).toEqual(["100-1", "100-2"]);
  });

  it("lists Genève's act pages", async () => {
    const { acts } = await geneveCity.list(
      site(
        '<a href="/administration-municipale/reglements-municipaux/lc21111-reglement-conseil-municipal-ville-geneve">PDF 21111 - Règlement du Conseil municipal de la Ville de Genève</a><a href="/autorites-administration/administration-municipale/reglements-municipaux?f%5B0%5D=categories%3A637">LC 21 100 - Autorités</a>',
      ),
    );
    expect(acts.map((a) => a.ref)).toEqual(["lc21111-reglement-conseil-municipal-ville-geneve"]);
  });

  it("lists Bellinzona's act pages, merged communes' regulations included", async () => {
    const { acts } = await bellinzonaCity.list(
      site(
        '<a href="https://www.bellinzona.ch/Regolamento-comunale-Citt-di-Bellinzona-4e93e800?i=1&MasterId=g1_35058">Regolamento comunale Città di Bellinzona</a><a href="https://www.bellinzona.ch/Camorino-Regolamento-sull-uso-dei-beni-comunali-51eb4900?i=1&MasterId=g1_35063">Camorino - Regolamento sull\'uso dei beni comunali</a>',
      ),
    );
    expect(acts.map((a) => a.ref)).toEqual([
      "Regolamento-comunale-Citt-di-Bellinzona-4e93e800",
      "Camorino-Regolamento-sull-uso-dei-beni-comunali-51eb4900",
    ]);
  });

  it("reads the file from the act's page, on the same host only", async () => {
    const adapter = linkedDocuments({
      key: "t",
      authority: "bfs1",
      name: "t",
      homepage: "https://www.geneve.ch/",
      licenceSpdx: "LicenseRef-ch-official-act",
      pages: ["https://www.geneve.ch/"],
      link: /x/,
      file: /\.pdf(?:[?#]|$)/i,
      include: /./,
      exclude: /^$/,
    });
    const doc = await adapter.document(
      { inForceFrom: "2026-11-08", inForceTo: null, pageUrl: "https://www.geneve.ch/a/lc1" },
      site(
        '<a href="https://cdn.example.org/x.pdf">other host</a><a href="/sites/default/files/2024-05/lc21111.pdf">Télécharger</a>',
      ),
    );
    expect(doc).toEqual({
      url: "https://www.geneve.ch/sites/default/files/2024-05/lc21111.pdf",
      format: "pdf",
    });
  });

  it("says which links the page held when it holds no file", async () => {
    const adapter = linkedDocuments({
      key: "t",
      authority: "bfs1",
      name: "t",
      homepage: "https://www.bellinzona.ch/",
      licenceSpdx: "LicenseRef-ch-official-act",
      pages: ["https://www.bellinzona.ch/"],
      link: /x/,
      file: /\.pdf(?:[?#]|$)/i,
      include: /./,
      exclude: /^$/,
    });
    await expect(
      adapter.document(
        { inForceFrom: "2026-11-08", inForceTo: null, pageUrl: "https://www.bellinzona.ch/a" },
        site('<a href="/Altra-pagina-1234abcd?i=1">x</a>'),
      ),
    ).rejects.toThrow(
      /no document on https:\/\/www\.bellinzona\.ch\/a; page: \d+ bytes, title "", 1 links, text "x"; same-host links: .*Altra-pagina/,
    );
  });

  it("takes a Bellinzona act's address as its PDF, which is what the site serves there", async () => {
    const pageUrl = "https://www.bellinzona.ch/Regolamento-comunale-4e93e800?i=1&MasterId=g1_35058";
    const never: typeof fetch = async () => {
      throw new Error("the act's address is the document: nothing else is fetched");
    };
    await expect(
      bellinzonaCity.document({ inForceFrom: "2026-11-08", inForceTo: null, pageUrl }, never),
    ).resolves.toEqual({ url: pageUrl, format: "pdf" });
  });
});
