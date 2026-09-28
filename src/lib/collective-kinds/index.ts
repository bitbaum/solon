// VENDORED from bitbaum/orangecat packages/collective-kinds@0.1.0 (src/index.ts).
// Do not edit here: change the package, then copy it back byte for byte.
// The package has no repository of its own yet; when it does (or ships on npm),
// this directory becomes a dependency and disappears.
/**
 * @bitbaum/collective-kinds — what kinds of collective exist, where they are,
 * and what they legally are. Data and pure functions; no product knows more
 * about another product through this package than these three facts.
 */
export {
  COLLECTIVE_KIND_IDS,
  COLLECTIVE_KINDS,
  COLLECTIVE_KIND_LIST,
  isCollectiveKindId,
  kindOf,
  type CollectiveKind,
  type CollectiveKindId,
} from "./kinds";
export {
  PLACE_NAME_MAX,
  formatPlace,
  isCountryCode,
  normalizePlace,
  placeKey,
  placeKeys,
  placeProblem,
  type Place,
  type PlaceProblem,
} from "./place";
export {
  LEGAL_STATUSES,
  LEGAL_STATUS_LABEL,
  legalProblem,
  legalRank,
  mayClaimDeductibleGifts,
  type LegalProblem,
  type LegalRecord,
  type LegalStatus,
} from "./legal";
