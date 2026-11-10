/** Money: exchange rates as data, conversion at a year's average rate, and formatting. */
export { defineRateTable, perBase, rateTableSchema, type RateTable } from "./rates";
export { convert, latestCommonYear, yearsFor, type Converted } from "./convert";
export { formatMoney, formatWithEquivalent } from "./format";
