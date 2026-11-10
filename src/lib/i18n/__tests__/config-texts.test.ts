import { describe, expect, it } from "vitest";
import { locales } from "@/i18n/routing";
import { localized } from "@/lib/places/place-view";
import { configTranslation } from "../config-catalog";
import { CONFIG_TEXT_SETS, textsIn, untranslated } from "../config-texts";

describe("the configuration's texts in every language", () => {
  it.each(locales.filter((l) => l !== "en"))(
    "every text a translated page shows has words in %s",
    (locale) => {
      expect(untranslated(locale, configTranslation)).toEqual([]);
    },
  );

  it("finds texts wherever they sit, and only localized ones", () => {
    const found = textsIn({ a: [{ en: "x", de: "y" }], b: { label: { en: "z" } }, n: 1, s: "s" });
    expect(found).toEqual([{ en: "x", de: "y" }, { en: "z" }]);
    expect(CONFIG_TEXT_SETS.some((s) => textsIn(s.value).length > 100)).toBe(true);
  });

  it("prefers the configuration's own words, then the catalog, then English", () => {
    expect(localized({ en: "Switzerland", ru: "Швейцарская Конфедерация" }, "ru")).toBe(
      "Швейцарская Конфедерация",
    );
    expect(localized({ en: "Switzerland" }, "ru")).toBe("Швейцария");
    expect(localized({ en: "No such text anywhere" }, "ru")).toBe("No such text anywhere");
  });
});
