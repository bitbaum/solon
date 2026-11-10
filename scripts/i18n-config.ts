/**
 * Which of the configuration's texts have no words in a language yet, by set.
 * `pnpm run i18n:config` lists them; `--json` prints a skeleton to fill into
 * data/i18n/config.json, keyed by the English words.
 */
import { locales } from "@/i18n/routing";
import { configTranslation } from "@/lib/i18n/config-catalog";
import { untranslated } from "@/lib/i18n/config-texts";

const json = process.argv.includes("--json");
const skeleton: Record<string, Record<string, string>> = {};
let total = 0;
for (const locale of locales.filter((l) => l !== "en")) {
  const missing = untranslated(locale, configTranslation);
  total += missing.length;
  for (const m of missing) (skeleton[m.english] ??= {})[locale] = "";
  if (!json) {
    console.log(`${locale}: ${missing.length} missing`);
    for (const m of missing) console.log(`  [${m.set}] ${m.english.slice(0, 100)}`);
  }
}
if (json) console.log(JSON.stringify(skeleton, null, 2));
if (total > 0) process.exitCode = 1;
