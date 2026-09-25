/**
 * Every language says everything English says — no more, no less.
 *
 * A missing key would quietly fall back to English (request.ts); an extra key
 * is a sentence nobody can see; a dropped `{placeholder}` renders a broken
 * sentence. All three are caught here instead of by a reader.
 */
import { describe, expect, it } from "vitest";
import { locales } from "../routing";
import en from "../../../messages/en.json";
import de from "../../../messages/de.json";
import fr from "../../../messages/fr.json";
import it_ from "../../../messages/it.json";
import ru from "../../../messages/ru.json";

type Tree = { [key: string]: string | Tree };

const CATALOGS: Record<string, Tree> = { en, de, fr, it: it_, ru };

function leaves(tree: Tree, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out.set(path, value);
    else for (const [p, v] of leaves(value, path)) out.set(p, v);
  }
  return out;
}

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

const source = leaves(en);

describe("message catalogs", () => {
  it("has a catalog for every declared locale", () => {
    expect(Object.keys(CATALOGS).sort()).toEqual([...locales].sort());
  });

  for (const locale of locales.filter((l) => l !== "en")) {
    describe(locale, () => {
      const target = leaves(CATALOGS[locale]);

      it("has every key English has", () => {
        const missing = [...source.keys()].filter((k) => !target.has(k));
        expect(missing).toEqual([]);
      });

      it("has no key English lacks", () => {
        const extra = [...target.keys()].filter((k) => !source.has(k));
        expect(extra).toEqual([]);
      });

      it("keeps every {placeholder}", () => {
        const broken = [...source].filter(
          ([k, v]) =>
            target.has(k) && placeholders(v).join() !== placeholders(target.get(k)!).join(),
        );
        expect(broken.map(([k]) => k)).toEqual([]);
      });

      it("leaves nothing empty", () => {
        const empty = [...target].filter(([, v]) => v.trim() === "").map(([k]) => k);
        expect(empty).toEqual([]);
      });
    });
  }
});
