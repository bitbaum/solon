import type { Metadata } from "next";
import PageLayout from "@/components/ui/page-layout";
import { Figure, Aside } from "@/components/learn/figure";
import { ProfileGrid } from "@/components/learn/profile-grid";
import { Trail } from "@/components/learn/trail";
import { GOVERNANCE_PROFILES, DEFAULT_PROFILE } from "@/lib/config/governance-profiles";
import { DECISION_CATEGORIES } from "@/lib/db/enums";

export const metadata: Metadata = {
  title: "Five ways to be an organization",
  description:
    "A town, an association, a cooperative, a collective and a company board — the same seven questions, five different constitutions.",
};

/**
 * The profiles page. The argument is the comparison itself: five reasonable
 * organizations answering identical questions differently, none of them wrong.
 *
 * A reader arriving here has already seen that methods and thresholds change
 * outcomes. This is where that becomes a choice they have to make.
 */
export default function ProfilesPage() {
  const profiles = Object.values(GOVERNANCE_PROFILES);

  return (
    <PageLayout
      title="Five ways to be an organization"
      description="The same seven questions. Five constitutions. None of them wrong — they are answering to different people."
    >
      <div className="mx-auto max-w-shell space-y-20">
        <section className="mx-auto max-w-copy space-y-5 text-base leading-relaxed text-fg-secondary">
          <p>
            A profile answers, for each of the {DECISION_CATEGORIES.length} categories of decision:
            by what method, at what threshold, with what turnout. One organization runs one profile.
          </p>
          <p>
            They are deliberately not a settings screen. A profile lives in code and ships through
            review, and an organization changing its own is a governance-rules decision like any
            other &mdash; humans only, two thirds. The alternative is a constitution one
            administrator can quietly restructure between two votes.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {profiles.map((profile) => (
            <article
              key={profile.id}
              className="rounded-control border border-default bg-surface-raised p-6"
            >
              <h2 className="font-display text-2xl text-fg-primary">{profile.label}</h2>
              <p className="mt-3 text-sm leading-relaxed text-fg-secondary">{profile.suitedTo}</p>
              {profile.id === DEFAULT_PROFILE && (
                <p className="mt-4 inline-flex rounded-pill border border-default px-3 py-1 font-mono text-xs uppercase tracking-caps text-fg-secondary">
                  Default
                </p>
              )}
            </article>
          ))}
        </section>

        <Figure
          label="Figure 6"
          title="The same seven questions, five answers each"
          caption="Read a row to see how differently reasonable organizations treat one kind of decision. Read a column to see a whole constitution."
          source="src/lib/config/governance-profiles.ts"
        >
          <ProfileGrid />
        </Figure>

        <section className="mx-auto max-w-copy space-y-5">
          <Aside title="Read the operations row first">
            It is where the profiles differ most, and it is the row an organization feels daily. A
            company board decides ordinary work by majority with a fifth of its weight present,
            because speed is the point. A collective needs consent for the same decision, because
            being able to stop something is the point. Both are correct.
          </Aside>
          <Aside title="And the bottom row last">
            Every profile raises the bar for its own rules, and none of them lets its agents near
            that row. That is the one line the profiles do not get to draw &mdash; it is drawn for
            them.
          </Aside>
        </section>

        <Trail
          stops={[
            {
              href: "/governance/who-decides",
              kind: "read",
              title: "The part no profile can change",
              blurb:
                "Four categories are closed to agents, including the one that would reopen them.",
            },
            {
              href: "/governance/methods",
              kind: "try",
              title: "What those method names do",
              blurb:
                "Consent, dots, approval, score, ranked — see each one counted on the same room.",
            },
            {
              href: "/orgs/new",
              kind: "do",
              title: "Found an organization",
              blurb:
                "Pick a profile and sign it into existence with your own key. No permission needed; everything after is voted.",
            },
          ]}
        />
      </div>
    </PageLayout>
  );
}
