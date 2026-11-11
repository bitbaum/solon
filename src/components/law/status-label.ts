import type { LawTranslator } from "./coverage-report";

/**
 * What to say about an act's status beside it: nothing when the publisher says it is in force,
 * "not in force" when it says so, and that it does not say when it does not. A publisher that
 * does not state a status is never reported as stating one.
 */
export function statusLabel(
  act: { inForce: boolean; statusStated: boolean },
  t: LawTranslator,
): string | null {
  if (!act.statusStated) return t("index.statusNotStated");
  return act.inForce ? null : t("index.notInForce");
}
