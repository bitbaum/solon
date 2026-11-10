import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LAW_AUTHORITIES, PRAVO_GOV_RU } from "@/lib/config/law";
import { LICENCES } from "@/lib/config/places/licences";
import { actNumber, documentsPage, documentsUrl, rowsOf } from "../pravo-gov-ru";

const fixture = (name: string) =>
  documentsPage.parse(JSON.parse(readFileSync(join(__dirname, "fixtures", "pravo", name), "utf8")));
const block = (authority: string) => PRAVO_GOV_RU.blocks.find((b) => b.authority === authority)!;

describe("Russia's official publication portal", () => {
  it("reads the Constitution's publications as one act, linked to the newest", () => {
    const { rows } = rowsOf(block("ru"), fixture("president-constitution.json").items);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      authority: "ru",
      kind: "constitution",
      title: "Конституция Российской Федерации",
      identity: { scheme: "publisher_ref", value: "pravo-gov-ru:ru:constitution" },
      statusStated: false,
    });
    expect(rows[0]!.more).toEqual([
      {
        scheme: "official_url",
        value: "http://publication.pravo.gov.ru/document/0001202210060013",
      },
    ]);
  });

  it("reads each of a subject's laws as its own act, with its number and its title on one line", () => {
    const page = fixture("region15-rkz.json");
    const { rows, skipped } = rowsOf(block("ru-se"), page.items);
    expect(skipped).toEqual([]);
    expect(rows).toHaveLength(page.items.length);
    const first = rows.find((r) => r.title.includes("№ 1-РКЗ") && r.title.includes("04.05.2026"))!;
    expect(first.authority).toBe("ru-se");
    expect(first.kind).toBe("statute");
    expect(first.title).not.toMatch(/\s{2,}|\n/);
    expect(first.more).toContainEqual({ scheme: "act_number", value: "2026/1-РКЗ" });
  });

  it("gives no number to an act published without one", () => {
    const doc = { eoNumber: "0".repeat(16), complexName: "x", documentTypeId: "t" };
    expect(actNumber({ ...doc, number: "б/н", documentDate: "2014-07-29T00:00:00" })).toBeNull();
    expect(actNumber({ ...doc, number: "0", documentDate: "2014-02-21T00:00:00" })).toBeNull();
    expect(actNumber({ ...doc, number: "57-РЗ", documentDate: "2026-10-08T00:00:00" })).toBe(
      "2026/57-РЗ",
    );
  });

  it("asks for one block's laws, page by page, and only on the portal's own host", () => {
    const url = new URL(documentsUrl(block("ru-se"), 3));
    expect(PRAVO_GOV_RU.hosts).toContain(url.hostname);
    expect(url.searchParams.get("block")).toBe("region15");
    expect(url.searchParams.getAll("DocumentTypes")).toHaveLength(2);
    expect(url.searchParams.get("index")).toBe("3");
    // robots.txt disallows /File: the reader never asks for a file.
    expect(url.pathname.toLowerCase().startsWith("/file")).toBe(false);
  });

  it("names a known authority and a licence the policy lists for every block", () => {
    for (const b of PRAVO_GOV_RU.blocks) {
      expect(
        LAW_AUTHORITIES.some((a) => a.key === b.authority),
        b.authority,
      ).toBe(true);
    }
    expect(LICENCES.some((l) => l.spdx === PRAVO_GOV_RU.licenceSpdx)).toBe(true);
    expect(LAW_AUTHORITIES.find((a) => a.key === "ru-se")?.within).toBe("ru");
  });
});
