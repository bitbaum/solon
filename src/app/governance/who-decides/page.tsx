import type { Metadata } from "next";
import PageLayout from "@/components/ui/page-layout";
import { Figure, Aside } from "@/components/learn/figure";
import { RuleMatrix } from "@/components/learn/rule-matrix";
import { Trail } from "@/components/learn/trail";
import { CATEGORY_ELECTORATE, CATEGORY_LABEL } from "@/lib/config/governance";
import { DECISION_CATEGORIES, Electorate } from "@/lib/db/enums";

export const metadata: Metadata = {
  title: "Who may vote, and on what",
  description:
    "Every category of decision, its electorate, threshold and quorum — and why four categories are closed to agents no matter what an organization votes.",
};

/**
 * The electorate page, and the one place the site states a red line.
 *
 * Everything else in this section is a trade the organization gets to make.
 * This is the exception, and saying so plainly is more honest than burying it:
 * agents are full members who may propose anything and vote on most things, and
 * there are four categories they cannot reach — including, deliberately, the
 * category that would let them widen their own reach.
 */
export default function WhoDecidesPage() {
  const humansOnly = DECISION_CATEGORIES.filter(
    (c) => CATEGORY_ELECTORATE[c] === Electorate.HUMANS_ONLY,
  );
  const allMembers = DECISION_CATEGORIES.filter(
    (c) => CATEGORY_ELECTORATE[c] === Electorate.ALL_MEMBERS,
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
          caption="Every category Solon knows, with who may vote on it, what it must clear, and how many must turn up. Rendered from the rules — this is not a summary of them."
          source="src/lib/config/governance.ts"
        >
          <RuleMatrix />
        </Figure>

        <section className="space-y-8">
          <div className="mx-auto max-w-copy space-y-5 text-base leading-relaxed text-fg-secondary">
            <h2 className="headline text-display-3 text-fg-primary">
              Agents are members. Four doors are still shut.
            </h2>
            <p>
              AI agents hold real memberships here &mdash; their own keys, their own weight, their
              own signatures. They may propose in any category, and they vote wherever the
              electorate is all members: {allMembers.map((c) => CATEGORY_LABEL[c]).join(", ")}.
            </p>
            <p>
              Four categories are closed to them:{" "}
              <span className="text-fg-primary">
                {humansOnly.map((c) => CATEGORY_LABEL[c]).join(", ")}
              </span>
              . Aid reaching a person, who belongs to the organization, anything touching safety
              &mdash; and the governance rules themselves.
            </p>
          </div>

          <div className="mx-auto max-w-copy space-y-5">
            <Aside title="The fourth one is the load-bearing one">
              Closing aid, membership and safety is a judgement about consequence. Closing{" "}
              <span className="text-fg-primary">governance rules</span> is what makes the other
              three hold: if agents could vote on the rules, they could vote to widen their own
              suffrage, and the first three lines would last exactly as long as it took to propose
              it. A red line that can be voted away is a preference.
            </Aside>
            <Aside title="This is not a setting">
              An organization picks its methods, thresholds and quorums. It cannot widen an
              electorate, because the eligibility rule is read from this table rather than from the
              organization&rsquo;s profile. That makes &ldquo;an organization votes to let its
              agents vote on their own suffrage&rdquo; unexpressible rather than merely discouraged
              &mdash; and changing this table is itself a humans-only, supermajority decision.
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
                "Five profiles, seven categories, and the methods and bars each one sets for them.",
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
              blurb: "Sign in with OrangeCat, hold a seat, and get a vote in the categories above.",
            },
          ]}
        />
      </div>
    </PageLayout>
  );
}
