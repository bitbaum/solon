import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import PageLayout from "@/components/ui/page-layout";
import { MemberFace } from "@/components/ui/member-face";
import { profileFor, usesMandates } from "@/lib/config/governance-profiles";
import { isMandateLive } from "@/lib/domain/mandate";
import { orangecatProfileUrl } from "@/lib/domain/member-identity";
import { loadMemberPage } from "@/lib/domain/member-page";
import { orgBySlug } from "@/lib/domain/org";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string; id: string }>;

const day = (d: Date) => d.toISOString().slice(0, 10);

export async function generateMetadata({ params }: { params: Params }) {
  const { slug, id } = await params;
  const org = await orgBySlug(slug);
  const page = org ? await loadMemberPage(org.id, id) : null;
  return {
    title: page && org ? `${page.member.displayName} — ${org.name} — Solon` : "Member — Solon",
  };
}

/**
 * One seat, as a person's page in one group: who holds it, what it carries,
 * what they proposed and how often they voted. What this page shows about
 * individual ballots is the member's own choice — see lib/domain/member-page.ts.
 */
export default async function MemberPage({ params }: { params: Params }) {
  const { slug, id } = await params;
  const org = await orgBySlug(slug);
  if (!org) notFound();
  const page = await loadMemberPage(org.id, id);
  if (!page) notFound();

  const { member, filed, votesCast, ballots } = page;
  const profile = profileFor(org.governanceProfile);
  const profileUrl = orangecatProfileUrl(member.ocUsername);
  const decidesForGroup = usesMandates(profile) && isMandateLive(member, new Date());

  const fact = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between gap-4">
      <dt className="text-fg-secondary">{label}</dt>
      <dd className="text-right text-fg-primary">{value}</dd>
    </div>
  );

  return (
    <PageLayout kicker={org.name} title={member.displayName}>
      <div className="max-w-3xl space-y-10">
        <div className="rounded-surface border border-default bg-surface-base p-6">
          <div className="mb-4 flex items-center gap-3">
            <MemberFace
              name={member.displayName}
              username={member.ocUsername ?? null}
              avatarUrl={member.avatarUrl ?? null}
              size={48}
            />
            {profileUrl ? (
              <a href={profileUrl} className="text-sm text-fg-secondary underline" rel="noopener">
                @{member.ocUsername} on OrangeCat
              </a>
            ) : (
              <span className="text-sm text-fg-secondary">No public OrangeCat page</span>
            )}
          </div>
          <dl className="space-y-2 text-sm">
            {fact("Seat", member.memberType === "AGENT" ? "AI agent" : "Person")}
            {fact("Joined", day(member.joinedAt))}
            {member.status !== "ACTIVE" && fact("Status", member.status.toLowerCase())}
            {Number(member.votingWeight) !== 1 &&
              fact("Their vote counts", `${Number(member.votingWeight)} times`)}
            {decidesForGroup &&
              fact(
                "Mandate",
                member.mandateUntil
                  ? `decides on the group's behalf until ${day(member.mandateUntil)}`
                  : "decides on the group's behalf",
              )}
          </dl>
        </div>

        <section>
          <h2 className="mb-4 headline text-display-3 text-fg-primary">
            Proposals filed <span className="text-fg-tertiary">({filed.length})</span>
          </h2>
          {filed.length === 0 ? (
            <p className="text-sm text-fg-secondary">Nothing filed yet.</p>
          ) : (
            <ul className="space-y-3">
              {filed.map((p) => (
                <li
                  key={p.id}
                  className="rounded-control border border-default bg-surface-base p-4 text-sm"
                >
                  <Link
                    href={`/proposals/${p.id}`}
                    className="font-semibold text-fg-primary underline"
                  >
                    {p.title}
                  </Link>
                  <p className="mt-1 text-xs text-fg-secondary">
                    {p.category.toLowerCase().replaceAll("_", " ")} · {p.status.toLowerCase()} ·{" "}
                    {day(p.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-4 headline text-display-3 text-fg-primary">Votes</h2>
          <p className="text-sm text-fg-secondary">
            {votesCast === 0
              ? "No vote cast in a closed decision yet."
              : `Cast ${votesCast} ${votesCast === 1 ? "vote" : "votes"} in decisions that have closed.`}
          </p>
          {ballots === null ? (
            <p className="mt-3 text-sm leading-relaxed text-fg-secondary">
              {member.displayName} has not chosen to list each ballot here. The record of every
              closed decision still publishes its ballots; this page just does not gather them under
              one name.
            </p>
          ) : (
            ballots.length > 0 && (
              <ul className="mt-4 space-y-3">
                {ballots.map((b) => (
                  <li
                    key={`${b.proposalId}-${b.castAt.toISOString()}`}
                    className="flex flex-wrap items-baseline justify-between gap-2 rounded-control border border-default bg-surface-base p-4 text-sm"
                  >
                    <Link href={`/proposals/${b.proposalId}`} className="text-fg-primary underline">
                      {b.title}
                    </Link>
                    <span className="font-mono text-xs text-fg-secondary break-all">
                      {b.ballot}
                    </span>
                  </li>
                ))}
              </ul>
            )
          )}
        </section>

        <Link
          href={`/orgs/${org.slug}`}
          className="block text-sm text-fg-secondary transition-colors hover:text-fg-primary"
        >
          ← All members of {org.name}
        </Link>
      </div>
    </PageLayout>
  );
}
