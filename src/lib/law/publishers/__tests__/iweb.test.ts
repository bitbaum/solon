import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LAW_AUTHORITIES } from "@/lib/config/law";
import { PUBLISHERS } from "..";
import {
  actsOfLinks,
  actsOfRows,
  dayOf,
  documentOf,
  iweb,
  kindOf,
  noticeLinkOf,
  oneOfEachDay,
  readVersionPage,
  tableRows,
} from "../iweb";

const LIST = readFileSync(join(__dirname, "iweb-list.fixture.html"), "utf8");
const ACT = readFileSync(join(__dirname, "iweb-act.fixture.html"), "utf8");
const BASE = "https://www.stadt-schaffhausen.ch/rechtssammlung";

describe("the collection's table", () => {
  it("is read from the JSON in its data-entities attribute, escapes and all", () => {
    const rows = tableRows(LIST);
    expect(rows).toHaveLength(4);
    expect(rows[1]!.title).toBe(
      '<a href="/rechtssammlung/sammlung/1547363">Geschäftsordnung des Grossen Stadtrats von Schaffhausen</a>',
    );
    expect(rows[0]!._nummer).toBe("100.1");
  });

  it("lists each act once by its number, at its own page, and leaves forms and bare rows out", () => {
    const acts = actsOfRows([...tableRows(LIST), ...tableRows(LIST)], BASE);
    expect(acts).toEqual([
      {
        ref: "100.1",
        title: "Stadtverfassung",
        kind: "constitution",
        pageUrl: "https://www.stadt-schaffhausen.ch/rechtssammlung/sammlung/1547321",
      },
      {
        ref: "110.1",
        title: "Geschäftsordnung des Grossen Stadtrats von Schaffhausen",
        kind: "regulation",
        pageUrl: "https://www.stadt-schaffhausen.ch/rechtssammlung/sammlung/1547363",
      },
    ]);
  });

  it("names a row without a number by its page", () => {
    const [act] = actsOfRows(
      [{ title: '<a href="/reglements/106218">Règlement du personnel de la Ville de Sion</a>' }],
      "https://www.sion.ch/reglements",
    );
    expect(act).toMatchObject({ ref: "106218", kind: "regulation" });
  });
});

describe("what an act is", () => {
  it("is read from its title, in German and in French", () => {
    expect(kindOf("Gemeindeordnung der Stadt Luzern")).toBe("constitution");
    expect(kindOf("Règlement communal d'organisation (RCO)")).toBe("constitution");
    expect(kindOf("Feuerwehrverordnung der Stadt Thun (FWV)")).toBe("ordinance");
    expect(kindOf("Marktreglement der Stadt Thun (MR)")).toBe("regulation");
    expect(kindOf("Baugesetz")).toBe("regulation");
    expect(kindOf("Leitbild Kultur")).toBe("communal_act");
  });
});

describe("a day as a page words it", () => {
  it("reads German, French and numeric dates", () => {
    expect(dayOf("1. Januar 2012")).toBe("2012-01-01");
    expect(dayOf("1er janvier 2025")).toBe("2025-01-01");
    expect(dayOf("17 novembre 2025")).toBe("2025-11-17");
    expect(dayOf("30.09.2024")).toBe("2024-09-30");
    expect(dayOf("2024-09-30 00:00:00")).toBe("2024-09-30");
    expect(dayOf("—")).toBeNull();
  });
});

describe("an act's page", () => {
  const url = "https://www.stadt-schaffhausen.ch/rechtssammlung/sammlung/1547321";

  it("states when the version took effect and links the version before it", () => {
    expect(readVersionPage(ACT, url)).toEqual({
      inForceFrom: "2012-01-01",
      inForceTo: null,
      earlier: ["https://www.stadt-schaffhausen.ch/_rtr/information_1500001"],
    });
  });

  it("states the same in French, with the day it stopped applying", () => {
    const html = `<dl class="row"><dt>Numéro</dt><dd>170.1</dd><dt>Entrée en vigueur</dt>
      <dd>1er janvier 2025</dd><dt>Abrogé le</dt><dd>31 décembre 2025</dd></dl>`;
    expect(readVersionPage(html, "https://www.sion.ch/reglements/106218")).toMatchObject({
      inForceFrom: "2025-01-01",
      inForceTo: "2025-12-31",
    });
  });

  it("names its document in its own table, not the site's navigation", () => {
    expect(documentOf(ACT, url)).toBe("https://www.stadt-schaffhausen.ch/_doc/5519410");
    expect(documentOf('<nav><a href="/_doc/42">x</a></nav>', url)).toBeNull();
    expect(
      documentOf(
        '<table><tr><td><a href="/_docn/5181217/RCO_homologu%C3%A9.pdf">RCO</a></td></tr></table>',
        "https://www.sion.ch/reglements/1",
      ),
    ).toBe("https://www.sion.ch/_docn/5181217/RCO_homologu%C3%A9.pdf");
  });

  it("finds, on an earlier version's notice, the link that serves the file", () => {
    expect(
      noticeLinkOf('<a href="/_rtr/dokument_123">Weiter</a>', "https://www.thun.ch/_doc/123"),
    ).toBe("https://www.thun.ch/_rtr/dokument_123");
    expect(noticeLinkOf("<p>nothing</p>", "https://www.thun.ch/_doc/123")).toBeNull();
  });
});

describe("versions", () => {
  it("are oldest first, one per day, each earlier one ending the day before the next", () => {
    expect(
      oneOfEachDay([
        { inForceFrom: "2012-01-01", inForceTo: null, pageUrl: "c" },
        { inForceFrom: "1998-01-01", inForceTo: null, pageUrl: "a" },
        { inForceFrom: "1998-01-01", inForceTo: "2011-12-31", pageUrl: "b" },
      ]),
    ).toEqual([
      { inForceFrom: "1998-01-01", inForceTo: "2011-12-31", pageUrl: "b" },
      { inForceFrom: "2012-01-01", inForceTo: null, pageUrl: "c" },
    ]);
  });
});

/** A site that answers from a map of addresses; anything else is not there. */
const site = (pages: Record<string, string | Uint8Array>) =>
  (async (input: string | URL) => {
    const body = pages[String(input)];
    if (body === undefined) return new Response("not here", { status: 404 });
    return new Response(typeof body === "string" ? body : body.slice().buffer);
  }) as unknown as typeof fetch;

describe("the adapter", () => {
  const adapter = iweb(
    {
      key: "test-iweb",
      authority: "bfs2939",
      name: "Stadt Schaffhausen",
      homepage: "https://www.stadt-schaffhausen.ch/",
      licenceSpdx: "LicenseRef-ch-official-act",
      locale: "de",
      pages: [BASE, "https://www.stadt-schaffhausen.ch/moved"],
      follow: /\/kapitel\/\d+$/,
    },
    0,
  );
  const chapter = LIST.replace("1547321", "1547399").replace(
    "Stadtverfassung<",
    "Stadtverfassung (Kapitel)<",
  );

  it("reads the collection's page and its chapters on the same host, a missing page not stopping it", async () => {
    const listed = await adapter.list(
      site({
        [BASE]: LIST,
        "https://www.stadt-schaffhausen.ch/rechtssammlung/kapitel/12": chapter,
      }),
    );
    expect(listed.url).toBe(BASE);
    expect(listed.acts.map((a) => a.ref)).toEqual(["100.1", "110.1"]);
  });

  it("fails loudly when its pages list nothing", async () => {
    await expect(adapter.list(site({ [BASE]: "<html></html>" }))).rejects.toThrow(/listed no acts/);
  });

  it("follows the versions back and fetches an earlier version's file past its notice", async () => {
    const current = "https://www.stadt-schaffhausen.ch/rechtssammlung/sammlung/1547321";
    const earlier = "https://www.stadt-schaffhausen.ch/_rtr/information_1500001";
    const pdf = new TextEncoder().encode("%PDF-1.7 test\n%%EOF");
    const doFetch = site({
      [current]: ACT,
      [earlier]: `<dl><dt>Inkrafttreten</dt><dd>1. Januar 1998</dd></dl>
        <table><tr><td><a href="/_doc/1000">Stadtverfassung 1998</a></td></tr></table>`,
      "https://www.stadt-schaffhausen.ch/_doc/1000":
        '<p>Diese Version ist nicht mehr in Kraft.</p><a href="/_rtr/dokument_1000">Weiter</a>',
      "https://www.stadt-schaffhausen.ch/_rtr/dokument_1000": pdf,
    });
    const versions = await adapter.versions(current, doFetch);
    expect(versions).toEqual([
      { inForceFrom: "1998-01-01", inForceTo: "2011-12-31", pageUrl: earlier },
      { inForceFrom: "2012-01-01", inForceTo: null, pageUrl: current },
    ]);
    expect(await adapter.document(versions[1]!, doFetch)).toEqual({
      url: "https://www.stadt-schaffhausen.ch/_doc/5519410",
      format: "pdf",
    });
    expect(await adapter.document(versions[0]!, doFetch)).toEqual({
      url: "https://www.stadt-schaffhausen.ch/_rtr/dokument_1000",
      format: "pdf",
    });
  });

  it("dates a page that states no day by the day it is read", async () => {
    const url = "https://www.stadt-schaffhausen.ch/rechtssammlung/sammlung/1";
    const [version] = await adapter.versions(url, site({ [url]: "<p>Reglement</p>" }));
    expect(version).toMatchObject({ inForceTo: null, dateBasis: "retrieved", pageUrl: url });
  });
});

describe("the configured cities", () => {
  it("are registered, each a commune the register knows, within its canton", () => {
    for (const key of ["luzern-city", "thun", "chur", "schaffhausen-city", "sion"]) {
      const adapter = PUBLISHERS[key];
      expect(adapter, key).toBeDefined();
      const authority = LAW_AUTHORITIES.find((a) => a.key === adapter!.authority);
      expect(authority?.place?.scheme, key).toBe("bfs_municipality");
      expect(
        LAW_AUTHORITIES.some((a) => a.key === authority?.within),
        key,
      ).toBe(true);
    }
  });
});

describe("a collection page that links its acts without a table", () => {
  // As Sion's /reglements: act pages /reglements/<id>, among the site's other links.
  const html = `<nav><a href="/reglements">Règlements</a><a href="/actualites/5">Actualités</a></nav>
<ul>
  <li><a href="/reglements/106218">Règlement du personnel de la Ville de Sion</a></li>
  <li><a href="https://www.sion.ch/reglements/136996">Règlement du Conseil général</a></li>
  <li><a href="/reglements/106218">Règlement du personnel (doublon)</a></li>
  <li><a href="/reglements/200001">Formulaire de demande d'autorisation</a></li>
  <li><a href="https://example.org/reglements/1">Ailleurs</a></li>
</ul>`;

  it("lists each act page under the collection once, forms and other sites left out", () => {
    const acts = actsOfLinks(html, "https://www.sion.ch/reglements");
    expect(acts.map((a) => [a.ref, a.title, a.pageUrl])).toEqual([
      [
        "106218",
        "Règlement du personnel de la Ville de Sion",
        "https://www.sion.ch/reglements/106218",
      ],
      ["136996", "Règlement du Conseil général", "https://www.sion.ch/reglements/136996"],
    ]);
  });

  it("reads Thun's act pages under /sammlung/ too", () => {
    const acts = actsOfLinks(
      '<a href="/reglementeverordnungen/sammlung/1818328">Mobilitätsreglement</a>',
      "https://www.thun.ch/reglementeverordnungen",
    );
    expect(acts.map((a) => a.ref)).toEqual(["1818328"]);
  });

  it("reads acts served as publications", () => {
    const acts = actsOfLinks(
      '<a href="/_rte/publikation/106216">Règlement du conseil municipal (RCM)</a>',
      "https://www.sion.ch/reglements",
    );
    expect(acts.map((a) => [a.ref, a.pageUrl])).toEqual([
      ["106216", "https://www.sion.ch/_rte/publikation/106216"],
    ]);
  });
});
