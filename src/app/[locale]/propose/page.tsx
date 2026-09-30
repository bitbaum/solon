import { Link } from "@/i18n/navigation";
import { auth, authEnabled } from "@/lib/auth";
import EntryLinks, { ENTRY_COST } from "@/components/auth/entry-links";
import { memberForActor } from "@/lib/auth/recognition";
import { primaryOrg } from "@/lib/domain/org";
import FileProposal from "@/components/governance/file-proposal";
import PageLayout from "@/components/ui/page-layout";
import { draftFromQuery, rawQueryString, type Query } from "@/lib/domain/proposal-draft";

export const metadata = { title: "Suggest something — Solon" };
export const dynamic = "force-dynamic";

/**
 * Reachable directly, and pre-filled from a link: OrangeCat's "Govern it with
 * Solon" button, a ratification link, a Loki page. Whatever the link carried
 * must still be here after the sign-in round trip and after /join — a person
 * who pressed a button about a specific thing must never arrive at a blank
 * form that has forgotten it.
 */
export default async function ProposePage({ searchParams }: { searchParams: Promise<Query> }) {
  const q = await searchParams;
  const draft = draftFromQuery(q);
  const query = rawQueryString(q);
  const here = query ? `/propose?${query}` : "/propose";
  const org = await primaryOrg();
  const session = await auth();
  const member = session?.actorId && org ? await memberForActor(session.actorId, org.id) : null;

  if (!org) {
    return (
      <Shell>
        <p className="text-sm text-fg-secondary">
          There is no organization here yet, so there is nothing to suggest changes to.
        </p>
      </Shell>
    );
  }

  if (!member) {
    return (
      <Shell>
        <p className="text-sm leading-relaxed text-fg-secondary">
          Only members can make a suggestion, so everyone can see who asked for what. You are not a
          member of {org.name} yet.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          {session?.actorId || !authEnabled ? (
            <Link href={`/join?next=${encodeURIComponent(here)}`} className="btn-primary">
              Become a member
            </Link>
          ) : (
            <EntryLinks from={here} />
          )}
          <Link
            href="/proposals"
            className="text-sm text-fg-secondary transition-colors hover:text-fg-primary"
          >
            See what is being decided →
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <FileProposal orgSlug={org.slug} memberAddress={member.bitcoinAddress} initial={draft} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <PageLayout
      kicker="Decisions"
      title="Suggest something"
      description="Write down what you would like to change and why. It is saved as a draft; members vote once someone starts the vote."
    >
      <div className="max-w-2xl">{children}</div>
    </PageLayout>
  );
}
