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
