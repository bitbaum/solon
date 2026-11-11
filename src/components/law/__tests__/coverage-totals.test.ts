import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";
import en from "../../../../messages/en.json";
import de from "../../../../messages/de.json";
import fr from "../../../../messages/fr.json";
import it_ from "../../../../messages/it.json";
import ru from "../../../../messages/ru.json";

// /law/coverage printed "NaN more acts are listed…" (2026-11-10): the plural was handed the
// count already formatted ("1'849"), which is not a number. It chooses on `count` now and
// prints `notStated`, formatted like every other count on the page.
describe("acts whose publisher does not state whether they are in force", () => {
  const catalogs = { en, de, fr, it: it_, ru } as const;
  for (const locale of Object.keys(catalogs) as (keyof typeof catalogs)[]) {
    const messages = catalogs[locale];
    it(`reads as a number in ${locale}`, () => {
      const t = createTranslator({ locale, messages: messages as typeof en, namespace: "Law" });
      for (const n of [1, 1849]) {
        const line = t("coverage.totalsNotStated", {
          count: n,
          notStated: n.toLocaleString("en-CH"),
        });
        expect(line).not.toContain("NaN");
        expect(line).toContain(n.toLocaleString("en-CH"));
      }
    });
  }
});
