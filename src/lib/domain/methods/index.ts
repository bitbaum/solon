import { approval } from "./approval";
import { consent } from "./consent";
import { dot, dotMethod, DEFAULT_DOT_BUDGET } from "./dot";
import { ranked } from "./ranked";
import { score } from "./score";
import { singleChoice } from "./single-choice";
import type { Aggregate, AnyMethodSpec, BallotOption, MethodId, WeightedBallot } from "./types";

export * from "./types";
export { DEFAULT_DOT_BUDGET };

/**
 * Every method Solon can run. Adding one is a new file plus a line here — the
 * ballot schema, the signed encoding and the count travel together, so there is
 * no second place to forget to update.
 */
const REGISTRY = {
  single_choice: singleChoice,
  consent,
  approval,
  dot,
  score,
  ranked,
} as const satisfies Record<MethodId, AnyMethodSpec>;

export const ALL_METHODS: MethodId[] = Object.keys(REGISTRY) as MethodId[];

/**
 * Resolve a method, applying any session-scoped parameter. `dotBudget` is
 * snapshotted on the session at open, so a session counted a year from now
 * still uses the budget its voters were actually given.
 */
export function methodSpec(id: MethodId, params?: { dotBudget?: number | null }): AnyMethodSpec {
  const key = id;
  if (key === "dot" && params?.dotBudget) {
    return dotMethod(params.dotBudget) as AnyMethodSpec;
  }
  const spec = REGISTRY[key];
  if (!spec) throw new Error(`unknown voting method: ${String(id)}`);
  return spec as AnyMethodSpec;
}

/**
 * Validate a raw ballot against its method, returning the parsed value. The
 * caller must never sign or store anything this rejects.
 */
export function parseBallot(
  id: MethodId,
  raw: unknown,
  options: BallotOption[],
  params?: { dotBudget?: number | null },
): { ok: true; ballot: unknown } | { ok: false; error: string } {
  const spec = methodSpec(id, params);
  const result = spec.schema(options).safeParse(raw);
  if (!result.success) {
    return { ok: false, error: result.error.issues.map((i) => i.message).join("; ") };
  }
  return { ok: true, ballot: result.data };
}

/** The exact text fragment a ballot contributes to the signed message. */
export function canonicalBallot(
  id: MethodId,
  ballot: unknown,
  params?: { dotBudget?: number | null },
): string {
  return methodSpec(id, params).canonical(ballot);
}

export function aggregateBallots(
  id: MethodId,
  ballots: WeightedBallot[],
  options: BallotOption[],
  params?: { dotBudget?: number | null },
): Aggregate {
  return methodSpec(id, params).aggregate(ballots as WeightedBallot[], options);
}
