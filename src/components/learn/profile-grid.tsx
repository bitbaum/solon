import { GOVERNANCE_PROFILES, type GovernanceProfileId } from "@/lib/config/governance-profiles";
import { CATEGORY_LABEL } from "@/lib/config/governance";
import { DECISION_CATEGORIES, VoteThreshold } from "@/lib/db/enums";
import { methodSpec } from "@/lib/domain/methods";

/**
 * The five shipped profiles, side by side, rendered from the profile registry.
 *
 * The comparison is the argument: the same seven categories, five different
 * sets of answers, none of them wrong. A reader looking for "which one am I?"
 * gets that from `suitedTo`; a reader who wants to know what they are signing
 * up for gets the whole rule set, because a constitution summarised is a
 * constitution misread.
 */
const ORDER: GovernanceProfileId[] = [
  "TOWN",
  "ASSOCIATION",
  "COOPERATIVE",
  "COLLECTIVE",
  "COMPANY",
];

export function ProfileGrid() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[50rem] border-collapse text-sm">
        <caption className="sr-only">
          How each governance profile decides each category of question
        </caption>
        <thead>
          <tr className="border-b border-default">
            <th scope="col" className="py-3 pr-4 text-left font-semibold text-fg-primary">
              Category
            </th>
            {ORDER.map((id) => (
              <th key={id} scope="col" className="px-3 py-3 text-left align-top">
                <span className="block font-semibold text-fg-primary">
                  {GOVERNANCE_PROFILES[id].label}
                </span>
                <span className="mt-1 block text-xs font-normal leading-relaxed text-fg-secondary">
                  {GOVERNANCE_PROFILES[id].suitedTo}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DECISION_CATEGORIES.map((category) => (
            <tr key={category} className="border-b border-subtle align-top">
              <th scope="row" className="py-4 pr-4 text-left font-normal text-fg-primary">
                {CATEGORY_LABEL[category]}
              </th>
              {ORDER.map((id) => {
                const rule = GOVERNANCE_PROFILES[id].rules[category];
                return (
                  <td key={id} className="px-3 py-4">
                    <span className="block text-fg-primary">{methodSpec(rule.method).label}</span>
                    <span className="mt-1.5 block font-mono text-xs text-fg-secondary">
                      {/* The threshold is what a reader scans this table FOR, so a
                          supermajority is coloured rather than left to a glyph
                          nobody can pick out of a grid of forty cells. */}
                      <span
                        className={
                          rule.threshold === VoteThreshold.SUPERMAJORITY
                            ? "text-accent-text"
                            : undefined
                        }
                      >
                        {rule.threshold === VoteThreshold.SUPERMAJORITY ? "two thirds" : "50%"}
                      </span>
                      <span className="text-fg-muted"> · {rule.quorumPercent}% quorum</span>
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
