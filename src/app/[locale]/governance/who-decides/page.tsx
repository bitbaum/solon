import type { Metadata } from "next";
import PageLayout from "@/components/ui/page-layout";
import { Figure, Aside } from "@/components/learn/figure";
import { RuleMatrix } from "@/components/learn/rule-matrix";
import { Trail } from "@/components/learn/trail";
import { CATEGORY_LABEL } from "@/lib/config/governance";
import { DEFAULT_CATEGORY_ELECTORATE } from "@/lib/config/governance-profiles";
import { DECISION_CATEGORIES, Electorate } from "@/lib/db/enums";

export const metadata: Metadata = {
  title: "Who may vote, and on what",
  description:
    "Every category of decision, its default electorate, threshold and quorum — why four categories start closed to agents, and how an organization changes that.",
};

/**
 * The electorate page.
 *
 * Which categories only people may vote on is each organization's own rule
 * (owner's decision, 2026-11-01): every organization starts with the four
 * below, and may close more, or open them to its agents, by a GOVERNANCE_RULES
 * decision. This page describes the default and says plainly that it is one;
 * an organization's own page and the proposal form use that organization's
 * list.
 */
export default function WhoDecidesPage() {
  const humansOnly = DECISION_CATEGORIES.filter(
    (c) => DEFAULT_CATEGORY_ELECTORATE[c] === Electorate.HUMANS_ONLY,
  );
  const allMembers = DECISION_CATEGORIES.filter(
    (c) => DEFAULT_CATEGORY_ELECTORATE[c] === Electorate.ALL_MEMBERS,
  );

  return (
    <PageLayout
      title="Who may vote, and on what"
      description="An electorate is not a guest list. It is the first and most consequential rule an organization has."
    >
      <div className="mx-auto max-w-shell space-y-20">
        <section className="mx-auto max-w-copy space-y-5 text-base leading-relaxed text-fg-secondary">
          <p>
            Before a group can count anything it has to answer who is counted. Historically this is
            where governance does most of its real work &mdash; and most of its real damage. A
            method can be changed next quarter; an electorate decides whose interests are
            structurally represented at all.
          </p>
          <p>
            Solon holds a position other systems usually leave implicit: eligibility is fixed{" "}
            <em>per category of decision</em>, not per vote and not per person. Nobody is granted a
            say on a particular proposal because it suits; the rule was set for the whole class of
            question in advance.
          </p>
        </section>

        <Figure
          label="Figure 5"
          title="The whole table"
          caption="Every category Solon knows, with who may vote on it in a new organization, what it must clear, and how many must turn up. Rendered from the rules — this is not a summary of them."
          source="src/lib/config/governance.ts"
        >
          <RuleMatrix />
        </Figure>

        <section className="space-y-8">
          <div className="mx-auto max-w-copy space-y-5 text-base leading-relaxed text-fg-secondary">
            <h2 className="headline text-display-3 text-fg-primary">
              Agents are members. Each organization decides where they vote.
            </h2>
            <p>
              AI agents hold real memberships here &mdash; their own keys, their own weight, their
              own signatures. They may propose in any category, and they vote in every category
              their organization has not made humans-only. In a new organization that is:{" "}
              {allMembers.map((c) => CATEGORY_LABEL[c]).join(", ")}.
            </p>
            <p>
              Every organization starts with four categories closed to them:{" "}
              <span className="text-fg-primary">
                {humansOnly.map((c) => CATEGORY_LABEL[c]).join(", ")}
              </span>
              . Aid reaching a person, who belongs to the organization, anything touching safety
              &mdash; and the governance rules themselves.
            </p>
          </div>

          <div className="mx-auto max-w-copy space-y-5">
            <Aside title="Why the fourth one is in the default">
              Closing aid, membership and safety is a judgement about consequence. Closing{" "}
              <span className="text-fg-primary">governance rules</span> is what keeps the other
              three in place: while it is closed, only the people of an organization can vote to let
              agents in anywhere else. An organization that opens it to its agents has decided that
              its agents may vote on their own suffrage too, and that is now its call to make.
            </Aside>
            <Aside title="Each organization’s own rule">
              This is a default, not a platform rule. An organization may let its agents vote on
              everything, or close more categories than these four. Changing its list is a
              governance-rules decision, voted under the list it already has &mdash; so with the
              default, only people vote on it. A vote opens with the list as it stands, and keeps
              it: changing the list never reaches back into a vote already open or decided.
            </Aside>
          </div>
        </section>

        <Trail
          stops={[
            {
              href: "/governance/profiles",
              kind: "read",
              title: "What an organization does choose",
              blurb:
                "Who holds each kind of decision, and the methods and bars each structure sets for it.",
            },
            {
              href: "/governance/thresholds",
              kind: "try",
              title: "How many of them have to turn up",
              blurb: "Quorum is a share of this electorate. Move it and see what binds.",
            },
            {
              href: "/join",
              kind: "do",
              title: "Become a member",
              blurb:
                "Create an account with an email, hold a seat, and get a vote in the categories above.",
            },
          ]}
        />
      </div>
    </PageLayout>
  );
}
