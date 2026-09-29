/**
 * Solon's own words take no side about a place (design §7.2, §12). Every
 * message in every language is scanned for that language's terms; a term may
 * appear only in a quotation that names its source.
 */
import { describe, expect, it } from "vitest";
import { NEUTRAL_COPY_TERMS } from "@/lib/config/places/neutral-terms";
import { locales } from "../routing";
import en from "../../../messages/en.json";
import de from "../../../messages/de.json";
import fr from "../../../messages/fr.json";
import it_ from "../../../messages/it.json";
import ru from "../../../messages/ru.json";

type Tree = { [key: string]: string | Tree };

const CATALOGS: Record<string, Tree> = { en, de, fr, it: it_, ru };

/** Every message with its path, except quotations that carry their source. */
function ownWords(tree: Tree, prefix = ""): [string, string][] {
  const out: [string, string][] = [];
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      if (!(key === "quote" && typeof tree.source === "string" && tree.source.length > 0)) {
        out.push([path, value]);
      }
    } else {
      out.push(...ownWords(value, path));
    }
  }
  return out;
}

const escape = (term: string) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const atWordStart = (term: string) => new RegExp(`(?<![\\p{L}\\p{N}])${escape(term)}`, "iu");

describe("neutral copy", () => {
  it("has a term list for every language the site speaks", () => {
    for (const locale of locales) {
      expect(NEUTRAL_COPY_TERMS[locale]?.length ?? 0, locale).toBeGreaterThan(0);
    }
  });

  for (const locale of locales) {
    it(`${locale}: no message takes a side`, () => {
      const terms = NEUTRAL_COPY_TERMS[locale]!.map((term) => [term, atWordStart(term)] as const);
      const hits = ownWords(CATALOGS[locale]!).flatMap(([path, text]) =>
        terms.filter(([, pattern]) => pattern.test(text)).map(([term]) => `${path}: "${term}"`),
      );
      expect(hits).toEqual([]);
    });
  }

  it("matches at word starts only, and lets an attributed quotation through", () => {
    expect(atWordStart("liberated territor").test("deliberated territory")).toBe(false);
    expect(atWordStart("liberated territor").test("the liberated territories")).toBe(true);
    expect(atWordStart("sogenannt").test("die Sogenannte Republik")).toBe(true);
    const tree: Tree = {
      a: { quote: "a so-called republic", source: "source-key" },
      b: { quote: "a so-called republic" },
    };
    expect(ownWords(tree).map(([path]) => path)).toEqual(["a.source", "b.quote"]);
  });
});
