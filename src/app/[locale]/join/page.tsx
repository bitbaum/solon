import { Link } from "@/i18n/navigation";
import PageLayout from "@/components/ui/page-layout";
import { auth, authEnabled } from "@/lib/auth";
import EntryLinks, { ENTRY_COST } from "@/components/auth/entry-links";
import { memberForActor } from "@/lib/auth/recognition";
import { genesisOpen } from "@/lib/domain/membership";
import { founderRule, genesisRefusalCopy, genesisVerdict } from "@/lib/domain/founder";
import { primaryOrg } from "@/lib/domain/org";
import ClaimSeat from "@/components/governance/claim-seat";
import { isSafePath, type Query } from "@/lib/domain/proposal-draft";

export const metadata = { title: "Join — Solon" };
export const dynamic = "force-dynamic";

const one = (v: string | string[] | undefined): string => (Array.isArray(v) ? v[0] : v) ?? "";

/**
 * Every branch of this page ends in something the visitor can do right now:
 * sign in, join, vote, or read what was decided. "Nothing to do here" is not
 * one of the states, and no branch names a setting or a technical term — the
 * reader is anyone who wants to take part.
 *
 * `?next=` is where the visitor was going when membership got in the way — a
 * pre-filled proposal, usually. It rides through sign-in and the seat claim
 * (ClaimSeat reloads this URL, so it survives), and once they are a member it
 * is the first thing offered. Same-origin paths only.
 */
export default async function JoinPage({ searchParams }: { searchParams: Promise<Query> }) {
  const q = await searchParams;
  const next = isSafePath(one(q.next)) ? one(q.next) : null;
  const here = next ? `/join?next=${encodeURIComponent(next)}` : "/join";
  const org = await primaryOrg();
  if (!org) {
    return (
      <Page title="Nothing to join yet">
        <p>There is no organization here yet. You can start one.</p>
        <Actions>
          <Link href="/orgs/new" className="btn-primary">
            Start an organization
          </Link>
        </Actions>
      </Page>
    );
  }

  const session = await auth();
  const record = (
    <Secondary href="/governance/audit">See everything {org.name} has decided</Secondary>
  );

  if (!session?.actorId) {
    return (
      <Page title={`Join ${org.name}`}>
        <p>Sign in so the other members know it is you. Voting is then one click. {ENTRY_COST}</p>
        <Actions>
          {authEnabled ? (
            <EntryLinks from={here} />
          ) : (
            <p>Signing in is not switched on here yet.</p>
          )}
          {record}
        </Actions>
      </Page>
    );
  }

  const member = await memberForActor(session.actorId, org.id);
  if (member) {
    return (
      <Page title={`You're a member of ${org.name}`}>
        <dl className="space-y-3">
          <Row label="Your name, as members see it" value={member.displayName} />
          <Row label="Votes you carry" value={member.votingWeight.toString()} />
          <Row
            label="How you vote"
            value={
              member.bitcoinAddress
                ? "One click, or signed with your Bitcoin key"
                : "One click, while signed in"
            }
          />
        </dl>
        <Actions>
          {next ? (
            <>
              <Link href={next} className="btn-primary">
                Continue where you left off
              </Link>
              <Secondary href="/dashboard/voting">See what is being decided</Secondary>
            </>
          ) : (
            <>
              <Link href="/dashboard/voting" className="btn-primary">
                See what is being decided
              </Link>
              <Secondary href="/propose">Suggest something</Secondary>
            </>
          )}
        </Actions>
      </Page>
    );
  }

  const open = await genesisOpen(org.slug);
  if (!open) {
    return (
      <Page title={`Join ${org.name}`}>
        <p>
          New members join {org.name} when a member suggests it and the members vote yes. Ask
          someone in {org.name} to suggest you. Meanwhile you can read everything: who the members
          are, every decision, and where the money goes.
        </p>
        <Actions>
          <Link href="/governance/audit" className="btn-primary">
            See everything {org.name} has decided
          </Link>
          <Secondary href="/orgs/new">Or start your own organization</Secondary>
        </Actions>
      </Page>
    );
  }

  // Unclaimed is not claimable: a seeded organization's seat belongs to the
  // identity the deployment names, and this page never offers a button the
  // API would refuse.
  const verdict = genesisVerdict(session.actorId, founderRule());
  if (!verdict.allowed) {
    return (
      <Page title={`${org.name} isn't open to join yet`}>
        <p>{genesisRefusalCopy(verdict, org.name)}</p>
        <Actions>
          <Link href="/orgs/new" className="btn-primary">
            Start your own organization
          </Link>
          {record}
        </Actions>
      </Page>
    );
  }

  return (
    <Page title={`Become ${org.name}'s first member`}>
      <p className="mb-6">
        You are {org.name}&apos;s founder. Joining is written into its public record, and from then
        on new members join by a vote of the members.
      </p>
      <ClaimSeat
        orgSlug={org.slug}
        actorId={session.actorId}
        defaultName={session.user?.name ?? ""}
      />
    </Page>
  );
}

function Page({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <PageLayout title={title} kicker="Membership">
      <div className="max-w-2xl rounded-surface border border-default bg-surface-base p-6 text-base leading-relaxed text-fg-secondary">
        {children}
      </div>
    </PageLayout>
  );
}

function Actions({ children }: { children: React.ReactNode }) {
  return <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">{children}</div>;
}

function Secondary({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-sm font-semibold text-fg-secondary underline-offset-4 transition-colors hover:text-fg-primary hover:underline"
    >
      {children}
    </Link>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-6">
      <dt>{label}</dt>
      <dd className="font-medium text-fg-primary sm:text-right">{value}</dd>
    </div>
  );
}
