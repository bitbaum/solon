import type { Metadata } from "next";
import PageLayout from "@/components/ui/page-layout";
import { Figure, Aside } from "@/components/learn/figure";
import { QuorumLab } from "@/components/learn/quorum-lab";
import { Trail } from "@/components/learn/trail";
import {
  CATEGORY_QUORUM_PERCENT,
  CATEGORY_LABEL,
  SUPERMAJORITY_FRACTION,
  VOTING_WINDOW_DAYS,
} from "@/lib/config/governance";
import { DECISION_CATEGORIES } from "@/lib/db/enums";

export const metadata: Metadata = {
  title: "Quorum and threshold",
  description:
    "The two numbers every constitution argues about — how many had to turn up, and how much of them had to agree.",
};

/**
 * The second lever. Methods decide what is asked; quorum and threshold decide
 * what it takes for the answer to bind.
 *
 * The lab here is the point: these are the numbers people argue about in the
 * abstract for an hour and understand in ten seconds once they can move them.
 */
export default function ThresholdsPage() {
  const sorted = [...DECISION_CATEGORIES].sort(
    (a, b) => CATEGORY_QUORUM_PERCENT[a] - CATEGORY_QUORUM_PERCENT[b],
  );
  const lowest = sorted[0];
  const highest = sorted[sorted.length - 1];

  return (
    <PageLayout
      title="Quorum and threshold"
      description="How many had to turn up, and how much of them had to agree. Two numbers, and almost every governance argument lives in them."
    >
      <div className="mx-auto max-w-shell space-y-20">
        <section className="mx-auto max-w-copy space-y-5 text-base leading-relaxed text-fg-secondary">
          <p>
            <span className="text-fg-primary">Quorum</span> is the share of eligible voting weight
            that has to cast a ballot before the result counts at all. It exists to stop a handful
            of members deciding something on a quiet week, and it is the reason not voting is never
            neutral: abstention is what starves a quorum.
          </p>
          <p>
            <span className="text-fg-primary">Threshold</span> is how much of the decisive vote has
            to be in favour. Simple majority means more yes than no. Supermajority here means at
            least two thirds of the yes-and-no votes &mdash; abstentions have already done their job
            at the quorum test and drop out of this one.
          </p>
          <p>
            Raising either protects against a rushed or narrow decision, and makes the organization
            easier to paralyse. That trade is the whole subject.
          </p>
        </section>

        <Figure
          label="Figure 4"
          title="The same vote, passing and failing"
          caption="Move turnout, the quorum bar, and the yes share. The arithmetic is the arithmetic Solon applies when a session closes."
          source="the rules in src/lib/config/governance.ts"
        >
          <QuorumLab />
        </Figure>

        <section className="mx-auto max-w-copy space-y-5">
          <Aside title="Three outcomes, not two">
            A session that misses quorum is not rejected &mdash; it is <em>not decisive</em>.
            Nothing was decided, so nothing can be cited later as having been decided. Collapsing
            that into &ldquo;failed&rdquo; is how an organization ends up bound by a decision six
            people made on a Tuesday.
          </Aside>
          <Aside title="A supermajority is a minority veto, viewed from the other side">
            Requiring two thirds to agree is identical to letting just over one third refuse. That
            is the correct instrument for changing the rules themselves, and a poor one for ordinary
            work &mdash; which is exactly how Solon assigns it.
          </Aside>
        </section>

        <section className="space-y-8">
          <div className="mx-auto max-w-copy">
            <h2 className="font-display text-display-3 text-fg-primary">
              What Solon asks for, by category
            </h2>
            <p className="mt-4 text-base leading-relaxed text-fg-secondary">
              The bar rises with what is at stake. {CATEGORY_LABEL[lowest]} needs{" "}
              {CATEGORY_QUORUM_PERCENT[lowest]}% turnout because ordinary work has to be cheap to
              decide; {CATEGORY_LABEL[highest]} needs {CATEGORY_QUORUM_PERCENT[highest]}% and two
              thirds in favour, because it is the category that can rewrite every other row.
            </p>
          </div>

          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((category) => (
              <li
                key={category}
                className="rounded-control border border-default bg-surface-raised p-5"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold text-fg-primary">{CATEGORY_LABEL[category]}</span>
                  <span className="font-mono text-2xl tabular-nums text-accent-text">
                    {CATEGORY_QUORUM_PERCENT[category]}%
                  </span>
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-pill bg-surface-overlay">
                  <div
                    className="h-full rounded-pill bg-accent"
                    style={{ width: `${CATEGORY_QUORUM_PERCENT[category]}%` }}
                  />
                </div>
                <p className="mt-3 text-xs text-fg-muted">quorum of eligible weight</p>
              </li>
            ))}
          </ol>

          <p className="mx-auto max-w-copy text-sm leading-relaxed text-fg-secondary">
            A session stays open for {VOTING_WINDOW_DAYS} days, and its rules &mdash; electorate,
            threshold, quorum &mdash; are snapshotted the moment it opens. Editing the table above
            never rewrites a vote that is already running, which is the difference between a
            constitution and a settings page. Supermajority is fixed at{" "}
            {Math.round(SUPERMAJORITY_FRACTION * 100)}% of the decisive vote.
          </p>
        </section>

        <Trail
          stops={[
            {
              href: "/governance/who-decides",
              kind: "read",
              title: "Who was eligible in the first place",
              blurb:
                "Quorum is a share of the electorate — so the prior question is who the electorate is.",
            },
            {
              href: "/governance/methods",
              kind: "try",
              title: "The ballot itself",
              blurb: "Thresholds only make sense for some questions. See which, and why.",
            },
            {
              href: "/governance/audit",
              kind: "record",
              title: "Check the arithmetic yourself",
              blurb: "Closed sessions publish their rules, their ballots and their tally.",
            },
          ]}
        />
      </div>
    </PageLayout>
  );
}
