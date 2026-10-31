/**
 * A question asked from a page about one place: the authorities whose law
 * applies there (the place's own, and those above it) are always searched, and
 * "here" means that place. The place page names them from its chain's
 * identifiers; the route accepts only keys the register knows.
 */
import { LAW_AUTHORITIES } from "@/lib/config/law";
import type { Plan } from "./plan";

export interface AskScope {
  /** The place's name, as the page shows it. */
  place: string;
  authorities: string[];
  topic?: "tax";
}

const KEYS = new Set(LAW_AUTHORITIES.map((a) => a.key));

/** The authorities that make law for places with these identifiers. */
export function lawAuthoritiesFor(identifiers: readonly { scheme: string; value: string }[]) {
  const held = new Set(identifiers.map(({ scheme, value }) => `${scheme}:${value}`));
  return LAW_AUTHORITIES.filter(
    (a) => a.place && held.has(`${a.place.scheme}:${a.place.value}`),
  ).map((a) => a.key);
}

/** What the planner is told about the page the question was asked from. */
export function scopeContext(scope: AskScope | undefined): string {
  if (!scope) return "";
  // The name comes from the browser: only a name's characters reach the prompt.
  const place = scope.place.replace(/[^\p{L}\p{N} .'()-]/gu, "").slice(0, 80);
  const keys = scope.authorities.filter((k) => KEYS.has(k));
  const topic = scope.topic === "tax" ? " about tax" : "";
  return `\n\nThe person is asking${topic} from the page of ${place}: "here" means ${place}, and its authorities (${keys.join(", ")}) belong in authorities unless the question is plainly about somewhere else only.`;
}

/** The plan, with the page's authorities always among the places searched. */
export function applyScope(plan: Plan, scope: AskScope | undefined): Plan {
  if (!scope) return plan;
  const keys = scope.authorities.filter((k) => KEYS.has(k));
  return { ...plan, authorities: [...new Set([...plan.authorities, ...keys])] };
}
