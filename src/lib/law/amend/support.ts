/**
 * Counting support: one standing per supporter per revision, the latest row
 * wins, accounts and keys counted apart (design: 2026-11-amending-the-law.md).
 * Rows are only ever added, so a withdrawal is a row, not a deletion.
 */

export type SupportKind = "support" | "withdraw";
export type SupportProof = "ACCOUNT" | "BIP137";

export interface SupportRow {
  supporter: string;
  kind: SupportKind;
  proof: SupportProof;
  recordedAt: Date;
}

export interface SupportCount {
  /** Supporters whose latest row is a support. */
  total: number;
  /** Of those, how many signed with their own key: recountable without Solon. */
  signed: number;
  /** Of those, how many are Solon's record of a signed-in account. */
  account: number;
}

/** Who stands behind a revision now. Rows may come in any order. */
export function countSupport(rows: readonly SupportRow[]): SupportCount {
  const latest = new Map<string, SupportRow>();
  for (const row of rows) {
    const seen = latest.get(row.supporter);
    if (!seen || row.recordedAt.getTime() >= seen.recordedAt.getTime()) {
      latest.set(row.supporter, row);
    }
  }
  const standing = [...latest.values()].filter((r) => r.kind === "support");
  return {
    total: standing.length,
    signed: standing.filter((r) => r.proof === "BIP137").length,
    account: standing.filter((r) => r.proof === "ACCOUNT").length,
  };
}
