import { describe, expect, it } from "vitest";
import {
  fetchLiechtensteinRegister,
  kindOfLiAct,
  liRows,
  parseSystematicRegister,
} from "../li-systematic";

/** Lines as the register's PDF text gives them: a page header, headings, acts, change history. */
const PAGE = `172.015.1
LGBl. Nr.
51
Art. 52 ........................................................ G 15.12.2011, 2012 31
172.01 Regierung
172.013 G vom 23. Mai 1996 über die Durchführung der Wettbe-
werbsregeln im Europäischen Wirtschaftsraum ................ 1996 113
Änderungen / *Aufhebungen
Art. 72 ........................................................ G 27.11.2003, 2004 33
152.2 Ausländer*
152.20 G vom 17. September 2008 über die Ausländer (Auslän-
dergesetz; AuG) ................................................ 2008 311
831.30 G vom 10. Dezember 1965 über Ergänzungsleistungen zur Alters-, Hinterlassenen-
und Invalidenversicherung (ELG) .............................. 1965 46
210.0 Allgemeines bürgerliches Gesetzbuch vom 1. Juni 1811 (ABGB) ............ ASW
0.101 Konvention vom 4. November 1950 zum Schutze der Menschenrechte und Grundfreiheiten (EMRK) ............ 1982 60/1
Erneuerungen
130 Staatsschutzgesetz vom 14. März 1949 (StSchG) ................... 1949 8`;

describe("parseSystematicRegister", () => {
  const acts = parseSystematicRegister([PAGE]);

  it("finds the acts, and neither the headings, the page header nor the change history", () => {
    expect(acts.map((a) => a.lr)).toEqual(["172.013", "152.20", "831.30", "210.0", "0.101", "130"]);
  });

  it("makes a word broken at a line end whole, but keeps a hyphen before 'und'", () => {
    expect(acts[0]!.title).toBe(
      "G vom 23. Mai 1996 über die Durchführung der Wettbewerbsregeln im Europäischen Wirtschaftsraum",
    );
    expect(acts[1]!.title).toBe(
      "G vom 17. September 2008 über die Ausländer (Ausländergesetz; AuG)",
    );
    expect(acts[2]!.title).toContain("Hinterlassenen- und Invalidenversicherung");
  });

  it("reads the Landesgesetzblatt issue, including a treaty's 60/1, and none for an Austrian-era act", () => {
    expect(acts[1]!.lgbl).toEqual({ year: "2008", number: "311" });
    expect(acts[4]!.lgbl).toEqual({ year: "1982", number: "60/1" });
    expect(acts[3]!.lgbl).toBeNull();
  });

  it("reads each act once, even when the register repeats its number", () => {
    expect(parseSystematicRegister([PAGE, PAGE])).toHaveLength(acts.length);
  });
});

describe("kindOfLiAct", () => {
  const kind = (lr: string, title: string) => kindOfLiAct({ lr, title, lgbl: null });
  it("tells a statute, an ordinance, a notice, a constitution and a treaty apart", () => {
    expect(kind("152.20", "G vom 17. September 2008 über die Ausländer")).toBe("statute");
    expect(kind("172.1", "V vom 1. Januar 2000 über etwas")).toBe("ordinance");
    expect(kind("101.101", "Km vom 6. Juni 1929")).toBe("notice");
    expect(kind("101", "Verfassung des Fürstentums Liechtenstein vom 5. Oktober 1921 (LV)")).toBe(
      "constitution",
    );
    expect(kind("0.101", "Konvention vom 4. November 1950")).toBe("treaty");
  });
  it("reads a statute or a regulation from the end of its first word, and leaves the unknown as other", () => {
    expect(kind("130", "Staatsschutzgesetz vom 14. März 1949")).toBe("statute");
    expect(kind("172.9", "Geschäftsordnung vom 1. Januar 2000")).toBe("regulation");
    expect(kind("999", "Etwas ganz anderes")).toBe("other");
  });
});

describe("liRows", () => {
  it("states every act as in force, named by its LR number, with its Landesgesetzblatt issue", () => {
    const { rows } = liRows(parseSystematicRegister([PAGE]));
    expect(rows[1]).toMatchObject({
      authority: "li",
      inForce: true,
      locale: "de",
      identity: { scheme: "li_lr", value: "152.20" },
      systematicNumber: "152.20",
      more: [{ scheme: "li_lgbl", value: "2008/311" }],
    });
    expect(rows[3]!.more).toBeUndefined();
  });
});

describe("fetchLiechtensteinRegister", () => {
  const listing = `<h2>Systematisches Register</h2><a href="/konso/systematisches-register/100">Stand 1. Oktober 2026</a>`;
  const pdf = new TextEncoder().encode("%PDF-1.7 ...");
  const stub = (pages: Record<string, Response>) =>
    (async (input: string | URL | Request) => {
      const found = pages[new URL(String(input)).pathname];
      return found ?? new Response("gone", { status: 404 });
    }) as typeof fetch;

  it("reads the listing, then the edition it names", async () => {
    const result = await fetchLiechtensteinRegister(
      stub({
        "/konso/systematisches-register": new Response(listing),
        "/konso/systematisches-register/100": new Response(pdf),
      }),
      0,
    );
    expect(result.url).toBe("https://www.gesetze.li/konso/systematisches-register/100");
    expect(new TextDecoder().decode(result.bytes.slice(0, 5))).toBe("%PDF-");
  });

  it("stops at the publisher's proof-of-work page; it is not solved", async () => {
    await expect(
      fetchLiechtensteinRegister(
        stub({
          "/konso/systematisches-register": new Response("<script>array_to_hex_string()</script>"),
        }),
        0,
      ),
    ).rejects.toThrow("proof-of-work");
  });

  it("refuses an edition that is not a PDF", async () => {
    await expect(
      fetchLiechtensteinRegister(
        stub({
          "/konso/systematisches-register": new Response(listing),
          "/konso/systematisches-register/100": new Response("<html>challenge</html>"),
        }),
        0,
      ),
    ).rejects.toThrow("not a PDF");
  });
});
