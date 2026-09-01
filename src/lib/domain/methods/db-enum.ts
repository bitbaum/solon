import { VotingMethod } from "@/lib/db/enums";
import type { MethodId } from "./types";

/**
 * The storage form ⇄ the domain form.
 *
 * Kept apart from the method registry so that registry stays free of storage
 * concerns: the voter's browser has to compute a ballot's canonical encoding
 * to show them what they are signing, and it should not have to know how the
 * database spells a method to do it.
 */
const TO_ID: Record<VotingMethod, MethodId> = {
  [VotingMethod.SINGLE_CHOICE]: "single_choice",
  [VotingMethod.CONSENT]: "consent",
  [VotingMethod.APPROVAL]: "approval",
  [VotingMethod.DOT]: "dot",
  [VotingMethod.SCORE]: "score",
  [VotingMethod.RANKED]: "ranked",
};

const TO_ENUM: Record<MethodId, VotingMethod> = {
  single_choice: VotingMethod.SINGLE_CHOICE,
  consent: VotingMethod.CONSENT,
  approval: VotingMethod.APPROVAL,
  dot: VotingMethod.DOT,
  score: VotingMethod.SCORE,
  ranked: VotingMethod.RANKED,
};

export function methodId(method: VotingMethod): MethodId {
  return TO_ID[method];
}

export function methodEnum(id: MethodId): VotingMethod {
  return TO_ENUM[id];
}
