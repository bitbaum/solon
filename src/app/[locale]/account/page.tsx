import { getLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { auth, signOut } from "@/lib/auth";
import { membershipsForActor } from "@/lib/auth/recognition";

export const metadata = { title: "Account — Solon" };
export const dynamic = "force-dynamic";

/**
 * The one personal page. It answers exactly two questions — who does
 * OrangeCat say you are, and where do you hold a seat — and is honest about
 * the boundary between them: a seat comes from proof (the founding seat, or
 * founding your own organization) or from a vote, never from signing up.
 */
export default async function AccountPage() {
  const session = await auth();

  // Signed out: the sign-in page does this job, and brings them back here.
  if (!session?.actorId) {
    return redirect({
      href: { pathname: "/sign-in", query: { from: "/account" } },
      locale: await getLocale(),
    });
  }

  const memberships = await membershipsForActor(session.actorId);

  return (
    <main className="max-w-xl mx-auto py-16">
      <h1 className="headline text-display-3 text-fg-primary mb-8">Account</h1>

      <section className="bg-surface-base border border-default rounded-surface p-6 mb-6">
        <h2 className="text-sm font-semibold text-fg-secondary uppercase tracking-wide mb-4">
          OrangeCat identity
        </h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-fg-secondary">Name</dt>
            <dd className="text-fg-primary font-medium">{session.user?.name ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-fg-secondary">Email</dt>
            <dd className="text-fg-primary">{session.user?.email ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-fg-secondary">Actor id</dt>
            <dd className="text-fg-primary font-mono text-xs break-all">{session.actorId}</dd>
          </div>
        </dl>
      </section>

      <section className="bg-surface-base border border-default rounded-surface p-6 mb-8">
        <h2 className="text-sm font-semibold text-fg-secondary uppercase tracking-wide mb-4">
          Governance membership
        </h2>
        {memberships.length > 0 ? (
          <ul className="space-y-6">
            {memberships.map((member) => (
              <li key={member.id}>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-fg-secondary">Organization</dt>
                    <dd>
                      <Link
                        href={`/orgs/${member.organization.slug}`}
                        className="text-fg-primary font-medium underline"
                      >
                        {member.organization.name}
                      </Link>
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-fg-secondary">Member</dt>
                    <dd className="text-fg-primary">{member.displayName}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-fg-secondary">Voting weight</dt>
                    <dd className="text-fg-primary">{member.votingWeight.toString()}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-fg-secondary">How you vote</dt>
                    <dd className="text-fg-primary font-mono text-xs break-all">
                      {member.bitcoinAddress ?? "one click, with this account"}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-fg-secondary">
              You are recognized but not on a roster, so you can read everything and vote on nothing
              yet.
            </p>
            <Link href="/join" className="btn-primary mt-5 inline-flex">
              Become a member
            </Link>
          </>
        )}
        <Link
          href="/orgs/new"
          className="mt-5 block text-sm text-fg-secondary transition-colors hover:text-fg-primary"
        >
          Found an organization →
        </Link>
      </section>

      <div className="flex items-center gap-4">
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-fg-primary border border-default rounded-control hover:bg-surface-raised transition-colors"
          >
            Sign out
          </button>
        </form>
        <Link href="/proposals" className="text-sm text-fg-primary underline">
          Go to proposals
        </Link>
      </div>
    </main>
  );
}
