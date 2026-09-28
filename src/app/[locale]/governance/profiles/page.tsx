import type { Metadata } from "next";
import PageLayout from "@/components/ui/page-layout";
import { Figure, Aside } from "@/components/learn/figure";
import { ProfileGrid } from "@/components/learn/profile-grid";
import { Trail } from "@/components/learn/trail";
import {
  GOVERNANCE_PROFILE_IDS,
  GOVERNANCE_PROFILES,
  DEFAULT_PROFILE,
} from "@/lib/config/governance-profiles";
import { DECISION_CATEGORIES } from "@/lib/db/enums";

export const metadata: Metadata = {
  title: "Who decides, and how",
  description:
    "One person decides, everyone decides, or elected delegates decide — plus the house styles of an association, a cooperative, a collective and a company board.",
};

/**
 * The profiles page. The argument is the comparison itself: reasonable
 * organizations answering identical questions differently, none of them wrong.
 *
 * The labels say what a structure does, never what it resembles. "One person
 * decides" is not called a monarchy and "elected delegates decide" is not
 * called a republic: those words carry centuries of verdicts, and a founder
 * choosing how their project runs deserves a description, not a judgement.
 *
 * A reader arriving here has already seen that methods and thresholds change
 * outcomes. This is where that becomes a choice they have to make.
 */
export default function ProfilesPage() {
  const profiles = GOVERNANCE_PROFILE_IDS.map((id) => GOVERNANCE_PROFILES[id]);

  return (
    <PageLayout
      title="Who decides, and how"
      description="The same questions, answered by one person, by everyone, or by people the members elected. None of them wrong — they are answering to different people."
    >
      <div className="mx-auto max-w-shell space-y-20">
        <section className="mx-auto max-w-copy space-y-5 text-base leading-relaxed text-fg-secondary">
          <p>
            A profile answers, for each of the {DECISION_CATEGORIES.length} categories of decision:
            who decides it, by what method, at what threshold, with what turnout. One organization
            runs one profile.
          </p>
          <p>
            The first question is the one that separates structures. In some, one person decides
            everything &mdash; a founder building in the open is entitled to that, provided everyone
            who joins is told, and the organization&apos;s page tells them. In others every member
            votes on everything. In between, members grant mandates for a term to delegates who run
            things day to day and answer for it at the next election; when a term lapses, the
            decisions come back to the members until they elect someone again.
          </p>
          <p>
            None of this needs protecting from copying. Solon is open source: anyone who wants a
            different structure can take the whole thing, change it, and run their own. What keeps a
            structure honest is that it is stated plainly and that leaving is always possible.
          </p>
          <p>
            Profiles are deliberately not a settings screen. A profile lives in code and ships
            through review, and an organization changing its own is a governance-rules decision
            taken under the profile it already has. The alternative is a constitution one
            administrator can quietly restructure between two votes.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {profiles.map((profile) => (
            <article
              key={profile.id}
              className="rounded-control border border-default bg-surface-raised p-6"
            >
              <h2 className="headline text-2xl text-fg-primary">{profile.label}</h2>
              <p className="mt-3 text-sm leading-relaxed text-fg-secondary">{profile.suitedTo}</p>
              <p className="mt-3 text-sm leading-relaxed text-fg-tertiary">{profile.whoDecides}</p>
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
          title="The same questions, answered by each profile"
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
                "Pick who decides and found it — no permission needed. Everything after is decided under the structure you picked.",
            },
          ]}
        />
      </div>
    </PageLayout>
  );
}
