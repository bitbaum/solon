import {
  CATEGORY_ELECTORATE,
  CATEGORY_THRESHOLD,
  CATEGORY_QUORUM_PERCENT,
  CATEGORY_LABEL,
  CATEGORY_MEANING,
} from "@/lib/config/governance";
import { DECISION_CATEGORIES, Electorate, VoteThreshold } from "@/lib/db/enums";

/**
 * Who decides what, rendered from the rules themselves.
 *
 * Every value in this table is read from `src/lib/config/governance.ts` at
 * build time. There is no copy of these numbers in the page, which matters more
 * here than anywhere else on the site: this is the table a reader would cite
 * when deciding whether to trust the thing, and a stale published constitution
 * is worse than none.
 */
export function RuleMatrix() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[42rem] border-collapse text-sm">
        <caption className="sr-only">
          Each category of decision, with who may vote on it, the threshold it must clear, and the
          quorum it needs
        </caption>
        <thead>
          <tr className="border-b border-default">
            <th scope="col" className="py-3 pr-4 text-left font-semibold text-fg-primary">
              Category
            </th>
            <th
              scope="col"
              className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-caps text-fg-secondary"
            >
              Who votes
            </th>
            <th
              scope="col"
              className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-caps text-fg-secondary"
            >
              Threshold
            </th>
            <th
              scope="col"
              className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-caps text-fg-secondary"
            >
              Quorum
            </th>
          </tr>
        </thead>
        <tbody>
          {DECISION_CATEGORIES.map((category) => {
            const humansOnly = CATEGORY_ELECTORATE[category] === Electorate.HUMANS_ONLY;
            const superMajority = CATEGORY_THRESHOLD[category] === VoteThreshold.SUPERMAJORITY;
            return (
              <tr key={category} className="border-b border-subtle align-top">
                <th scope="row" className="py-4 pr-4 text-left font-normal">
                  <span className="font-semibold text-fg-primary">{CATEGORY_LABEL[category]}</span>
                  <span className="mt-1 block max-w-copy text-xs leading-relaxed text-fg-secondary">
                    {CATEGORY_MEANING[category]}
                  </span>
                </th>
                <td className="px-3 py-4">
                  <span
                    className={`inline-block whitespace-nowrap rounded-pill border px-3 py-1 text-xs ${
                      humansOnly
                        ? "border-status-warning text-status-warning"
                        : "border-default text-fg-secondary"
                    }`}
                  >
                    {humansOnly ? "Humans only" : "All members"}
                  </span>
                </td>
                <td className="px-3 py-4 text-fg-secondary">
                  {superMajority ? "Two thirds" : "Simple majority"}
                </td>
                <td className="px-3 py-4 text-right font-mono tabular-nums text-fg-primary">
                  {CATEGORY_QUORUM_PERCENT[category]}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
