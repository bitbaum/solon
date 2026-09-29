// VENDORED from bitbaum/orangecat packages/tax-model@0.1.0 (src/index.ts).
// Do not edit here: change the package, then copy it back byte for byte.
// The package has no repository of its own yet; when it does (or ships on npm),
// this directory becomes a dependency and disappears.
/**
 * @bitbaum/tax-model — a tax formula as data, and the pure evaluator that turns
 * it into an estimate. Knows no country: levels, metrics and currencies come
 * from the model and the facts it is given.
 */
export {
  TAX_MODEL_SCHEMA_VERSION,
  modelProblems,
  tariffProblem,
  type Bracket,
  type Fact,
  type FactRef,
  type MultiplierRef,
  type Tariff,
  type TaxComponent,
  type TaxModel,
} from './model';
export {
  applyTariff,
  evaluate,
  referencedLevels,
  taxingLevels,
  type ComponentResult,
  type Estimate,
  type EvaluateInput,
} from './evaluate';
