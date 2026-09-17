import type { Metadata } from "next";
import PageLayout from "@/components/ui/page-layout";
import { Figure, Aside } from "@/components/learn/figure";
import { DecisionPipeline } from "@/components/learn/decision-pipeline";
import { CycleDiagram } from "@/components/learn/cycle-diagram";
import { Trail } from "@/components/learn/trail";
import { ALL_METHODS } from "@/lib/domain/methods";
import { GOVERNANCE_PROFILES } from "@/lib/config/governance-profiles";
import { DECISION_CATEGORIES } from "@/lib/db/enums";
import { CYCLE_QUESTION } from "@/lib/governance/worked-example";

export const metadata: Metadata = {
  title: "The art and science of governance",
  description:
    "How a group turns disagreement into a decision — the four questions every organization answers, and what changes when you answer them differently.",
};

/**
 * The entry point to the teaching half of the site.
 *
 * Solon's other pages answer "what does this product do". This one answers the
 * question underneath it — why the answer is not obvious — because a reader who
 * believes voting is simple reads six counting methods as six settings nobody
 * needs. Its job is to make the design space visible and then get out of the
 * way: every claim here is demonstrated on a page it links to, using the
 * product's own code.
 */
export default function GovernancePage() {
  const methodCount = ALL_METHODS.length;
  const profileCount = Object.keys(GOVERNANCE_PROFILES).length;

  return (
    <PageLayout
      title="The art and science of governance"
      description="Every group decides things. Most never choose how — and the how decides the what."
    >
      <div className="mx-auto max-w-shell space-y-20">
        <section className="mx-auto max-w-copy space-y-5 text-base leading-relaxed text-fg-secondary">
          <p>
            Governance is the machinery a group uses to turn disagreement into something it can act
            on. It is a <span className="text-fg-primary">science</span> in that the machinery has
            properties you can prove: some ways of counting can elect an option almost nobody wants,
            and this has been known, with the arithmetic attached, since the 1780s.
          </p>
          <p>
            It is an <span className="text-fg-primary">art</span> in that no single set of rules is
            best. Speed trades against deliberation; a high bar protects a minority and also lets
            one member freeze everything. Those trades belong to the group, which is why Solon ships{" "}
            {methodCount} counting methods and {profileCount} profiles instead of one opinion.
          </p>
          <p>
            What follows is the design space, with working demonstrations. Nothing on these pages is
            a mock: the tallies are produced by the same functions that count a real session, so if
            the product changes, the lesson changes with it.
          </p>
        </section>

        <section className="space-y-8">
          <div className="mx-auto max-w-copy text-center">
            <h2 className="font-display text-display-3 text-fg-primary">
              Four questions, always answered
            </h2>
            <p className="mt-4 text-base leading-relaxed text-fg-secondary">
              A group that has never discussed its governance has still answered all four — by
              default, usually badly, and never on the record.
            </p>
          </div>
          <DecisionPipeline />
        </section>

        <section className="space-y-8">
          <Figure
            label="Figure 1"
            title="Sometimes there is no answer to find"
            caption={
              <>
                Three members rank three options; <em>{CYCLE_QUESTION}</em> Every option is beaten
                by another, two votes to one, in a circle that never ends. This is not a tie and not
                a bug — the group genuinely holds preferences that no single winner satisfies.
              </>
            }
            source='methodSpec("ranked").aggregate() — src/lib/domain/methods/ranked.ts'
          >
            <CycleDiagram />
          </Figure>

          <div className="mx-auto max-w-copy space-y-5">
            <Aside title="Why this matters more than it looks">
              Most tools would still print a winner here, and the group would never learn that the
              winner was chosen by the counting rule rather than by them. Solon computes the
              head-to-head result alongside the ordering and reports{" "}
              <code className="font-mono text-xs text-fg-primary">condorcet: none</code> when the
              circle closes. Being told there is no answer is more useful than being handed one.
            </Aside>
          </div>
        </section>

        <section className="mx-auto max-w-copy space-y-5 text-base leading-relaxed text-fg-secondary">
          <h2 className="font-display text-display-3 text-fg-primary">
            What Solon takes a position on
          </h2>
          <p>
            Almost nothing — deliberately. The methods, thresholds and quorums are the
            organization&rsquo;s to choose, across {DECISION_CATEGORIES.length} categories of
            decision.
          </p>
          <p>
            Two things are not negotiable. A vote is a message signed by the member&rsquo;s own key,
            so a tally is evidence rather than an assertion. And four categories &mdash; aid
            reaching a person, membership, safety, and the governance rules themselves &mdash; are
            closed to agents, so no organization can vote its agents into deciding their own
            suffrage.
          </p>
        </section>

        <Trail
          title="Where to go next"
          stops={[
            {
              href: "/governance/methods",
              kind: "try",
              title: "How the question decides the answer",
              blurb: `Seven members, one set of preferences, five ways of counting — and the one almost every group defaults to is the one that disagrees. Runs Solon's real counting code in your browser.`,
            },
            {
              href: "/governance/thresholds",
              kind: "try",
              title: "Quorum and threshold",
              blurb:
                "The two numbers every constitution argues about. Move them and watch the same vote pass, fail, or decide nothing at all.",
            },
            {
              href: "/governance/who-decides",
              kind: "read",
              title: "Who may vote, and on what",
              blurb: `All ${DECISION_CATEGORIES.length} categories with their electorate, threshold and quorum — rendered from the rules themselves.`,
            },
            {
              href: "/governance/profiles",
              kind: "read",
              title: "Five ways to be an organization",
              blurb:
                "A town, an association, a co-op, a collective and a company board, compared rule by rule.",
            },
            {
              href: "/governance/voting",
              kind: "read",
              title: "How a vote is actually cast",
              blurb:
                "The signing step, and why the server can verify a ballot without ever holding a key.",
            },
            {
              href: "/governance/audit",
              kind: "record",
              title: "The record itself",
              blurb: "Append-only, public, and the only thing here that settles an argument.",
            },
          ]}
        />
      </div>
    </PageLayout>
  );
}
