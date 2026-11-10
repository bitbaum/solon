/**
 * The budgets configuration: the taxonomies every budget is placed on, the
 * scopes, and the budget documents read from budget laws. Imported series
 * (Eurostat) are facts in the database, read through src/lib/budgets/read.ts.
 */
import { defineBudgetDocuments, type Taxonomies } from "@/lib/budgets/documents";
import { COFOG } from "./cofog";
import { SOUTH_OSSETIA_BUDGETS } from "./documents/south-ossetia";
import { ESA_REVENUE } from "./revenue";

export { BUDGET_SCOPES, GENERAL_GOVERNMENT, STATE_BUDGET } from "./scopes";

export const BUDGET_TAXONOMIES: Taxonomies = { revenue: ESA_REVENUE, expenditure: COFOG };

export const BUDGET_DOCUMENTS = defineBudgetDocuments(BUDGET_TAXONOMIES, [
  ...SOUTH_OSSETIA_BUDGETS,
]);
