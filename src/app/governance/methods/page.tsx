import type { Metadata } from "next";
import PageLayout from "@/components/ui/page-layout";
import { Figure, Aside } from "@/components/learn/figure";
import { MethodLab } from "@/components/learn/method-lab";
import { TallyChart, Objections } from "@/components/learn/tally";
import { Trail } from "@/components/learn/trail";
import { ALL_METHODS, methodSpec } from "@/lib/domain/methods";
import {
  FUND_QUESTION,
  CONSENT_QUESTION,
  consentBallots,
  singleChoiceBallots,
  TOTAL_MEMBERS,
  AGREE_COUNT,
} from "@/lib/governance/worked-example";

export const metadata: Metadata = {
  title: "How the question decides the answer",
  description:
    "The same seven members, the same preferences, five ways of counting — and two different winners. A working demonstration using Solon's own counting code.",
};

/**
 * The centrepiece of the teaching section.
 *
 * One claim, demonstrated rather than asserted: the counting rule is not an
 * implementation detail, it is a decision about what the group is even being
 * asked. Everything numeric on this page comes from `aggregate()`, the function
 * that counts live sessions.
 */
export default function MethodsPage() {
  const yesNo = methodSpec("single_choice").aggregate(singleChoiceBallots(), []);
  const consent = methodSpec("consent").aggregate(consentBallots(), []);

  return (
    <PageLayout
      title="How the question decides the answer"
      description="Change nothing about the voters. Change only what the ballot asks. Watch the winner change."
    >
      <div className="mx-auto max-w-shell space-y-20">
        <section className="mx-auto max-w-copy space-y-5 text-base leading-relaxed text-fg-secondary">
          <p>
            A committee of seven has a shared fund and four things to spend it on. Each member has
            told you, honestly, how much they want each one. Nobody is strategising and nobody
            changes their mind below.
          </p>
          <p>
            The only thing that changes is the shape of the ballot &mdash; and with it, the winner.
          </p>
        </section>

        <Figure
          label="Figure 2"
          title={FUND_QUESTION}
          caption="Pick a way of counting. The preference table above the buttons never changes; only the question being asked of it does."
          source="methodSpec(id).aggregate() — src/lib/domain/methods/"
        >
          <MethodLab />
        </Figure>

        <section className="mx-auto max-w-copy space-y-5">
          <Aside title="Why &ldquo;pick one&rdquo; is the dangerous default">
            It is the ballot almost every group reaches for, and it is the only one here that can
            elect an option a majority actively does not want. It does that by discarding everything
            a member thinks except their favourite &mdash; so a group that splits its support across
            two similar options hands the decision to a third the rest of them rated zero.
          </Aside>
          <Aside title="And why the others are not simply better">
            Approval and score let a member back several options, which is more information and also
            more room to play games: rating your second choice honestly can cost your first the win.
            Dots force a priority because the budget is fixed. There is no method without a trade
            &mdash; only methods whose trades suit what you are deciding.
          </Aside>
        </section>

        <section className="space-y-8">
          <div className="mx-auto max-w-copy">
            <h2 className="font-display text-display-3 text-fg-primary">
              Counting heads, or asking about harm
            </h2>
            <p className="mt-4 text-base leading-relaxed text-fg-secondary">
              The five above all rank things. The deepest split in the list is not between them, but
              between asking <em>who is in favour</em> and asking <em>can anyone see harm here</em>.
              Same room, same question, two readings.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Figure
              label="Figure 3a"
              title="As a yes/no vote"
              caption={`${AGREE_COUNT} of ${TOTAL_MEMBERS} vote yes. A simple majority carries it, and the two objections become a number.`}
              source='methodSpec("single_choice").aggregate()'
            >
              <div className="space-y-6">
                <p className="text-sm text-fg-secondary">
                  <span className="text-fg-muted">On the table:</span> {CONSENT_QUESTION}
                </p>
                <TallyChart aggregate={yesNo} />
                <p className="rounded-control border border-status-positive px-4 py-3 text-sm text-status-positive">
                  Carried
                </p>
              </div>
            </Figure>

            <Figure
              label="Figure 3b"
              title="As a consent decision"
              caption="The identical ballots, read as consent. One reasoned objection is enough, so the proposal does not pass — and the reasons survive as text the group has to answer."
              source='methodSpec("consent").aggregate()'
            >
              <div className="space-y-6">
                <p className="text-sm text-fg-secondary">
                  <span className="text-fg-muted">On the table:</span> {CONSENT_QUESTION}
                </p>
                <Objections aggregate={consent} />
                <p className="rounded-control border border-status-warning px-4 py-3 text-sm text-status-warning">
                  Not passed — {consent.objections?.length ?? 0} objections to resolve
                </p>
              </div>
            </Figure>
          </div>

          <div className="mx-auto max-w-copy">
            <Aside title="Neither one is the cautious choice">
              Consent is not a stricter majority. A majority vote asks how many want it; consent
              asks whether anyone can articulate harm the group has missed, and you cannot outvote
              that with numbers. It is slow on purpose, and it hands one member real power &mdash;
              which is a reasonable trade for a safety decision and a poor one for booking a room.
            </Aside>
          </div>
        </section>

        <section className="space-y-8">
          <div className="mx-auto max-w-copy">
            <h2 className="font-display text-display-3 text-fg-primary">
              The {ALL_METHODS.length} methods, and what each is for
            </h2>
            <p className="mt-4 text-base leading-relaxed text-fg-secondary">
              Every line below is read from the method&rsquo;s own definition &mdash; the same
              object that validates the ballot, writes the text you sign, and counts the result.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[38rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-default">
                  <th scope="col" className="py-3 pr-4 text-left font-semibold text-fg-primary">
                    Method
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-caps text-fg-secondary"
                  >
                    Asks
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-caps text-fg-secondary"
                  >
                    Kind
                  </th>
                </tr>
              </thead>
              <tbody>
                {ALL_METHODS.map((id) => {
                  const spec = methodSpec(id);
                  return (
                    <tr key={id} className="border-b border-subtle align-top">
                      <th scope="row" className="py-4 pr-4 text-left">
                        <span className="font-semibold text-fg-primary">{spec.label}</span>
                        <span className="mt-1 block font-mono text-xs text-fg-muted">{id}</span>
                      </th>
                      <td className="max-w-copy px-3 py-4 leading-relaxed text-fg-secondary">
                        {spec.summary}
                      </td>
                      <td className="px-3 py-4">
                        <span className="inline-block whitespace-nowrap rounded-pill border border-default px-3 py-1 text-xs text-fg-secondary">
                          {spec.kind === "decision" ? "Decision" : "Ranking"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mx-auto max-w-copy">
            <Aside title="Decision or ranking is not a label, it is a constraint">
              A decision has a for-side and an against-side, so a threshold like &ldquo;two
              thirds&rdquo; means something. A ranking has neither &mdash; the order <em>is</em> the
              result. Applying a majority threshold to a five-way choice would reject the winner of
              almost every real vote, which is why Solon refuses to do it rather than offering it as
              an option.
            </Aside>
          </div>
        </section>

        <Trail
          stops={[
            {
              href: "/governance/thresholds",
              kind: "try",
              title: "Quorum and threshold",
              blurb:
                "You have chosen the question. Now: how many had to turn up, and how much of them had to agree?",
            },
            {
              href: "/governance/profiles",
              kind: "read",
              title: "Which method for which decision",
              blurb:
                "The five shipped profiles assign methods per category. See what a co-op picks where a company board does not.",
            },
            {
              href: "/governance",
              kind: "read",
              title: "When there is no answer",
              blurb:
                "Three members, three options, and a majority against every possible winner. Condorcet's paradox, drawn.",
            },
          ]}
        />
      </div>
    </PageLayout>
  );
}
