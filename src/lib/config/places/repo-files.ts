/**
 * The Places data kept in this repository, and the source each file is a
 * retrieval of. A merge that changes one is imported into production by
 * `.github/workflows/places-data.yml` (`pnpm run places:import-files`), so a
 * file edited here reaches the site without anyone remembering to load it.
 *
 * In the order they import: a file that builds on another comes after it
 * (Liechtenstein's communes before what is levied in them).
 * `src/lib/config/__tests__/places-repo-files.test.ts` holds every file under
 * `data/places/` to exactly one row here, and every row to a real source.
 */
export const PLACES_REPO_FILES: readonly { source: string; file: string }[] = [
  { source: "world-country-registry", file: "data/places/world/countries.json" },
  { source: "li-constitution-communes", file: "data/places/liechtenstein/communes.json" },
  { source: "li-income-tax", file: "data/places/liechtenstein/income-tax.json" },
  { source: "li-communal-surcharges", file: "data/places/liechtenstein/communal-surcharges.csv" },
  { source: "li-communal-tax-steps", file: "data/places/liechtenstein/tax-steps.csv" },
  { source: "ee-ehak-units", file: "data/places/estonia/administrative-units.json" },
  { source: "ee-income-tax", file: "data/places/estonia/income-tax.json" },
  { source: "us-census-units", file: "data/places/united-states/administrative-units.json" },
  {
    source: "us-census-county-boundaries",
    file: "data/places/united-states/county-boundaries.json",
  },
  { source: "us-federal-income-tax", file: "data/places/united-states/federal-income-tax.json" },
  { source: "wy-income-tax", file: "data/places/united-states/wyoming-income-tax.json" },
  { source: "ch-cantonal-tax-steps", file: "data/places/switzerland/tax-steps.csv" },
  { source: "ch-church-tariffs", file: "data/places/switzerland/church-tariffs.json" },
  { source: "ch-per-head-taxes", file: "data/places/switzerland/per-head-taxes.json" },
  { source: "ch-cantonal-adjustments", file: "data/places/switzerland/cantonal-adjustments.json" },
  { source: "estv-tax-localities", file: "data/places/switzerland/tax-localities.json" },
  { source: "vs-income-tax", file: "data/places/switzerland/valais-income-tax.json" },
  { source: "vd-income-tax-limit", file: "data/places/switzerland/vd-income-tax-limit.csv" },
  {
    source: "vd-income-tax-reduction",
    file: "data/places/switzerland/vd-income-tax-reduction.csv",
  },
];
