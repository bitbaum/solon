/**
 * Builds data/money/rates.json: each currency's yearly average rate against
 * the euro, from official publishers.
 *
 *   pnpm run money:rates            fetch and write the table
 *   pnpm run money:rates --dry-run  fetch and print what would change
 *
 * Eurostat's annual averages of the euro reference rates (ert_bil_eur_a,
 * national currency per euro) for every currency it publishes. For a year
 * Eurostat has no rate for the rouble (it stops after 2021), the Bank of
 * Russia's official rate of the euro, every day it was set that year,
 * averaged here: the computation is the only thing Solon adds, and the
 * table says so. Only complete years are written.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { cellsOf, eurostatJsonAdapter } from "@/lib/places/adapters/eurostat-json";
import { defineRateTable, type RateTable } from "@/lib/money";

const FILE = "data/money/rates.json";
const FROM_YEAR = 1999;
const USER_AGENT = "Solon exchange-rate reader (solon.orangecat.ch)";
const EUROSTAT =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/ert_bil_eur_a" +
  `?format=JSON&lang=EN&statinfo=AVG&unit=NAC&sinceTimePeriod=${FROM_YEAR}`;
const CBR = (year: number) =>
  `https://www.cbr.ru/scripts/XML_dynamic.asp?date_req1=01/01/${year}&date_req2=31/12/${year}&VAL_NM_RQ=R01239`;

const today = new Date().toISOString().slice(0, 10);
const lastFullYear = Number(today.slice(0, 4)) - 1;

async function get(url: string): Promise<Response> {
  const response = await fetch(url, { headers: { "user-agent": USER_AGENT } });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response;
}

/** The Bank of Russia's official euro rate on every day it set one in `year`, averaged. */
export function averageOfCbrXml(xml: string): { average: number; days: number } {
  const values = [...xml.matchAll(/<Nominal>(\d+)<\/Nominal><Value>([\d,]+)<\/Value>/g)].map(
    ([, nominal, value]) => Number(value!.replace(",", ".")) / Number(nominal),
  );
  if (values.length === 0) throw new Error("the Bank of Russia's answer holds no rate");
  return { average: values.reduce((n, v) => n + v, 0) / values.length, days: values.length };
}

async function main(): Promise<number> {
  const rates: RateTable["rates"] = {};
  const cube = eurostatJsonAdapter.schema.parse(await (await get(EUROSTAT)).json());
  for (const cell of cellsOf(cube)) {
    const cur = cell.codes.currency!;
    const year = Number(cell.codes.time);
    if (year > lastFullYear || !/^[A-Z]{3}$/.test(cur) || cur === "EUR") continue;
    (rates[cur] ??= {})[String(year)] = { perBase: cell.value, source: "eurostat-ert" };
  }
  for (let year = 2022; year <= lastFullYear; year++) {
    if (rates.RUB?.[String(year)]) continue;
    const xml = new TextDecoder("windows-1251").decode(await (await get(CBR(year))).arrayBuffer());
    const { average } = averageOfCbrXml(xml);
    (rates.RUB ??= {})[String(year)] = {
      perBase: Math.round(average * 10000) / 10000,
      source: "cbr-official",
    };
    await new Promise((r) => setTimeout(r, 1000));
  }
  const table = defineRateTable({
    base: "EUR",
    generatedOn: today,
    sources: [
      {
        key: "eurostat-ert",
        publisher: "Eurostat",
        dataset:
          "Euro/ECU exchange rates, annual data, average (ert_bil_eur_a): national currency per euro",
        url: "https://ec.europa.eu/eurostat/databrowser/view/ert_bil_eur_a/default/table",
        licence: "LicenseRef-eurostat-reuse",
        read: today,
      },
      {
        key: "cbr-official",
        publisher: "Bank of Russia",
        dataset:
          "Official rate of the euro against the rouble, every day it was set in the year, averaged by Solon",
        url: "https://www.cbr.ru/currency_base/dynamics/",
        licence: "LicenseRef-cbr-reuse",
        read: today,
      },
    ],
    rates: Object.fromEntries(Object.entries(rates).sort(([a], [b]) => a.localeCompare(b))),
  });
  const text = `${JSON.stringify(table, null, 2)}\n`;
  if (process.argv.includes("--dry-run")) {
    let before = "";
    try {
      before = readFileSync(FILE, "utf8");
    } catch {}
    console.log(before === text ? "no change" : `${FILE} would change`);
    return 0;
  }
  writeFileSync(FILE, text);
  console.log(`${FILE}: ${Object.keys(table.rates).length} currencies, base ${table.base}`);
  return 0;
}

if (process.argv[1]?.endsWith("money-rates.ts")) {
  main()
    .then((code) => process.exit(code))
    .catch((error: unknown) => {
      console.error(error);
      process.exit(2);
    });
}
