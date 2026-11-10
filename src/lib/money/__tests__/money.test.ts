import { describe, expect, it } from "vitest";
import { DISPLAY_CURRENCIES, RATES, displayCurrencyOf } from "@/lib/config/money";
import { convert, defineRateTable, formatMoney, perBase, yearsFor } from "..";
import { averageOfCbrXml } from "../../../../scripts/money-rates";

const table = defineRateTable({
  base: "EUR",
  generatedOn: "2026-11-10",
  sources: [
    {
      key: "a",
      publisher: "p",
      dataset: "d",
      url: "https://example.org",
      licence: "x",
      read: "2026-11-10",
    },
  ],
  rates: {
    CHF: { "2023": { perBase: 0.9718, source: "a" } },
    RUB: { "2023": { perBase: 92.8741, source: "a" } },
  },
});

describe("conversion", () => {
  it("goes through the base at the year's rates", () => {
    const r = convert(table, 9234425600, "RUB", "CHF", 2023)!;
    expect(r.amount).toBeCloseTo((9234425600 / 92.8741) * 0.9718, 0);
    expect(r.sources).toEqual(["a"]);
    expect(convert(table, 100, "EUR", "CHF", 2023)?.amount).toBeCloseTo(97.18, 6);
    expect(convert(table, 100, "CHF", "CHF", 1990)?.amount).toBe(100);
  });

  it("never borrows another year's rate: no rate, no conversion", () => {
    expect(convert(table, 100, "RUB", "CHF", 2022)).toBeNull();
    expect(perBase(table, "XYZ", 2023)).toBeNull();
    expect(yearsFor(table, "RUB")).toEqual([2023]);
  });

  it("refuses a rate naming a source the table does not list", () => {
    expect(() =>
      defineRateTable({ ...table, rates: { CHF: { "2023": { perBase: 1, source: "nope" } } } }),
    ).toThrow(/unknown source/);
  });

  it("writes money the reader's way", () => {
    expect(formatMoney(2_100_000_000, "CHF", "en")).toMatch(/CHF\s?2\.1B/);
  });
});

describe("the rates Solon holds", () => {
  it("convert every display currency in a recent complete year, the rouble included", () => {
    for (const cur of DISPLAY_CURRENCIES) {
      expect(perBase(RATES, cur, 2023), cur).not.toBeNull();
    }
    // The Bank of Russia's averaged official rate fills the years Eurostat no longer publishes.
    expect(RATES.rates.RUB?.["2023"]?.source).toBe("cbr-official");
    expect(RATES.rates.CHF?.["2023"]?.source).toBe("eurostat-ert");
  });

  it("falls back to the default display currency for anything not offered", () => {
    expect(displayCurrencyOf("EUR")).toBe("EUR");
    expect(displayCurrencyOf("XYZ")).toBe(DISPLAY_CURRENCIES[0]);
    expect(displayCurrencyOf(undefined)).toBe(DISPLAY_CURRENCIES[0]);
  });

  it("averages the Bank of Russia's daily official rates, per unit of its nominal", () => {
    const xml =
      '<ValCurs><Record Date="10.01.2023" Id="R01239"><Nominal>1</Nominal><Value>75,0785</Value></Record>' +
      '<Record Date="11.01.2023" Id="R01239"><Nominal>10</Nominal><Value>745,438</Value></Record></ValCurs>';
    expect(averageOfCbrXml(xml).average).toBeCloseTo((75.0785 + 74.5438) / 2, 6);
    expect(() => averageOfCbrXml("<ValCurs/>")).toThrow();
  });
});
