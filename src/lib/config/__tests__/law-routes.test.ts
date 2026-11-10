import { describe, expect, it } from "vitest";
import { ACT_KINDS, LAW_AUTHORITIES } from "@/lib/config/law";
import {
  OFFICIAL_ROUTES,
  localizeRoute,
  routesFor,
  type OfficialRoute,
} from "@/lib/config/law/routes";
import de from "../../../../messages/de.json";

describe("official routes", () => {
  it("are each for a known authority and known kinds of act, with unique keys", () => {
    const keys = OFFICIAL_ROUTES.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const route of OFFICIAL_ROUTES) {
      expect(
        LAW_AUTHORITIES.some((a) => a.key === route.authority),
        route.key,
      ).toBe(true);
      expect(route.appliesTo.length, route.key).toBeGreaterThan(0);
      for (const kind of route.appliesTo) expect(ACT_KINDS, route.key).toContain(kind);
    }
  });

  it("each cite the provision that makes them, read on a stated day", () => {
    for (const { key, source } of OFFICIAL_ROUTES) {
      expect(source.url, key).toMatch(/^https:\/\//);
      expect(source.provision.trim(), key).not.toBe("");
      expect(source.readOn, key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("offer a federal statute the petition, and only the Constitution the initiative", () => {
    expect(routesFor("ch", "statute").map((r) => r.key)).toEqual(["ch-petition"]);
    expect(routesFor("ch", "constitution").map((r) => r.key)).toEqual([
      "ch-popular-initiative",
      "ch-petition",
    ]);
    expect(routesFor("gl", "statute")).toEqual([]);
  });

  it("give Liechtenstein's law and each of its communes the routes their own law names", () => {
    expect(routesFor("li", "constitution").map((r) => r.key)).toEqual([
      "li-constitution-initiative",
      "li-constitution-referendum",
    ]);
    expect(routesFor("li", "statute").map((r) => r.key)).toEqual([
      "li-law-initiative",
      "li-law-referendum",
    ]);
    expect(routesFor("li7004", "communal_act").map((r) => r.key)).toEqual(["li7004-initiative"]);
    expect(routesFor("li", "statute")[0]!.signatures).toEqual({ count: 1_000 });
    expect(routesFor("li", "constitution")[0]!.signatures).toEqual({ count: 1_500 });
  });
});

const isLiechtenstein = (r: OfficialRoute) => /^li(\d{4})?$/.test(r.authority);
const LI_ROUTES = OFFICIAL_ROUTES.filter(isLiechtenstein);

/** Every number a text states, as digits: "1 000", "1,000" and "1000" are one number. */
const numbersIn = (text: string): string[] =>
  [...text.matchAll(/\d+(?:[ ,.'’  ]\d{3})*/g)].map((m) => m[0].replace(/\D/g, "")).sort();

/** Number words the English texts use, and the German word that must stand for each. */
const NUMBER_WORDS: [RegExp, RegExp][] = [
  [/\bthree\b/i, /\bdrei\b/i],
  [/\bfour\b/i, /\bvier\b/i],
  [/\btwo\b/i, /\bzwei\b/i],
  [/\bone sixth\b/i, /\bSechstel\b/i],
];

const textOf = (r: {
  name: string;
  whoMaySign: string;
  alsoRequired?: readonly string[];
  cannotChange?: string;
  outcome: string;
}) => [r.name, r.whoMaySign, ...(r.alsoRequired ?? []), r.cannotChange ?? "", r.outcome].join(" ");

describe("official routes in German", () => {
  it("has the Liechtenstein routes to speak of", () => {
    expect(LI_ROUTES.map((r) => r.key)).toEqual(
      expect.arrayContaining([
        "li-law-initiative",
        "li-law-referendum",
        "li-constitution-initiative",
        "li-constitution-referendum",
        "li7001-initiative",
        "li7011-initiative",
      ]),
    );
  });

  it("gives every Liechtenstein route German text, field for field", () => {
    for (const route of LI_ROUTES) {
      const text = route.text?.de;
      expect(text, route.key).toBeDefined();
      if (!text) continue;
      for (const field of [
        text.name,
        text.whoMaySign,
        text.outcome,
        text.sourceTitle,
        text.provision,
      ]) {
        expect(field?.trim(), route.key).toBeTruthy();
      }
      expect(text.alsoRequired?.length ?? 0, route.key).toBe(route.alsoRequired?.length ?? 0);
      expect(Boolean(text.cannotChange), route.key).toBe(Boolean(route.cannotChange));
      if (route.signatures && "percent" in route.signatures) {
        expect(text.signatureBase?.trim(), route.key).toBeTruthy();
      }
    }
  });

  it("states the same numbers as the English, and prints the signature count from the data", () => {
    for (const route of LI_ROUTES) {
      const text = route.text!.de!;
      expect(numbersIn(textOf(text)), route.key).toEqual(numbersIn(textOf(route)));
      expect(numbersIn(text.provision!), route.key).toEqual(numbersIn(route.source.provision));
      for (const [english, german] of NUMBER_WORDS) {
        if (english.test(textOf(route))) expect(textOf(text), route.key).toMatch(german);
      }
      // The bar is printed from `signatures`, never retyped, so German cannot disagree with it.
      const localized = localizeRoute(route, "de");
      expect(route.signatures, route.key).not.toBeNull();
      if ("count" in route.signatures!) {
        expect(localized.signatures, route.key).toEqual(route.signatures);
        expect(de.Amend.amendment.routeBar).toContain("{count}");
      } else {
        expect((localized.signatures as { percent: number }).percent, route.key).toBe(
          route.signatures!.percent,
        );
        expect(de.Amend.amendment.routeShare).toContain("{percent}");
      }
    }
  });

  it("leaves no English in a German field and no ß", () => {
    for (const route of LI_ROUTES) {
      const german = textOf(route.text!.de!);
      expect(german, route.key).not.toMatch(/\b(the|of the|voters|communes|signature)\b/i);
      expect(german, route.key).not.toContain("ß");
    }
  });

  it("localizes a route to German and leaves English the fallback", () => {
    const route = OFFICIAL_ROUTES.find((r) => r.key === "li-law-initiative")!;
    expect(localizeRoute(route, "de").name).toBe(route.text!.de!.name);
    expect(localizeRoute(route, "de").signatures).toEqual({ count: 1_000 });
    expect(localizeRoute(route, "de").source.url).toBe(route.source.url);
    expect(localizeRoute(route, "en")).toBe(route);
    expect(localizeRoute(route, "fr")).toBe(route);
    const swiss = OFFICIAL_ROUTES.find((r) => r.key === "ch-petition")!;
    expect(localizeRoute(swiss, "de")).toBe(swiss);
  });

  it("gives Liechtenstein's initiatives their six weeks from the Government's announcement, and the referendums their 30 days", () => {
    const byKey = (k: string) => OFFICIAL_ROUTES.find((r) => r.key === k)!;
    for (const key of ["li-law-initiative", "li-constitution-initiative"]) {
      const route = byKey(key);
      expect(route.window, key).toEqual({ days: 42 });
      expect(route.alsoRequired?.join(" "), key).toMatch(/Government \(Anmeldung\)/);
      expect(route.text?.de?.alsoRequired?.join(" "), key).toMatch(/sechs Wochen/);
      expect(route.text?.de?.cannotChange, key).toMatch(/zwei Jahren/);
    }
    for (const key of ["li-law-referendum", "li-constitution-referendum"]) {
      const route = byKey(key);
      expect(route.window, key).toEqual({ days: 30 });
      expect(route.alsoRequired?.join(" "), key).toMatch(/official announcement/);
      expect(route.text?.de?.alsoRequired?.join(" "), key).toMatch(/amtlichen Kundmachung/);
    }
  });
});
