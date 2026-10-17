import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { authLabelsFor, isDeliverable, signInMethods } from "@bitbaum/accountkit/auth";
import { SolonAccount } from "@/components/auth/account-screens";
import { Link, getPathname, redirect } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import { getAuth, getSession } from "@/lib/auth";
import { membershipsForActor } from "@/lib/auth/recognition";
import { setShowBallots } from "./actions";

export const metadata = { title: "Account — Solon" };
export const dynamic = "force-dynamic";

/**
 * The one personal page. It answers exactly two questions — who is this
 * account, and where does it hold a seat — and is honest about the boundary
 * between them: a seat comes from proof (the founding seat, or founding your
 * own organization) or from a vote, never from signing up.
 *
 * The account half is the fleet's shared panel (@bitbaum/accountkit): name,
 * ways to sign in (OrangeCat among them), passkeys, two-step codes, signing
 * out and leaving.
 */
export default async function AccountPage() {
  const locale = toLocale(await getLocale());
  const session = await getSession();

  // Signed out: the sign-in page does this job, and brings them back here.
  if (!session) {
    return redirect({ href: { pathname: "/sign-in", query: { from: "/account" } }, locale });
  }

  const { user } = session;
  const memberships = await membershipsForActor(user.actorId);
  const accounts = (await getAuth()
    .api.listUserAccounts({ headers: await headers() })
    .catch(() => [])) as { providerId: string }[];

  return (
    <main className="max-w-xl mx-auto py-16">
      <h1 className="headline text-display-3 text-fg-primary mb-8">Account</h1>

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
                <form action={setShowBallots} className="mt-4 border-t border-default pt-4">
                  <input type="hidden" name="memberId" value={member.id} />
                  <input type="hidden" name="show" value={member.showBallots ? "0" : "1"} />
                  <p className="text-sm leading-relaxed text-fg-secondary">
                    {member.showBallots
                      ? "Your member page lists how you voted in closed decisions."
                      : "Your member page shows how many votes you cast, not how you voted."}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-4">
                    <button type="submit" className="btn-secondary">
                      {member.showBallots ? "Stop listing my ballots" : "List how I voted"}
                    </button>
                    <Link
                      href={`/orgs/${member.organization.slug}/members/${member.id}`}
                      className="text-sm text-fg-secondary underline"
                    >
                      View your member page
                    </Link>
                  </div>
                </form>
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
        <p className="mt-5 text-xs text-fg-tertiary">
          Account id <span className="font-mono break-all">{user.actorId}</span>
        </p>
        <Link
          href="/orgs/new"
          className="mt-5 block text-sm text-fg-secondary transition-colors hover:text-fg-primary"
        >
          Found an organization →
        </Link>
      </section>

      <section className="bg-surface-base border border-default rounded-surface p-6 mb-8">
        <SolonAccount
          labels={authLabelsFor(locale)}
          methods={signInMethods(process.env, false)}
          user={{
            name: user.name ?? "",
            email: isDeliverable(user.email) ? user.email : null,
            emailVerified: Boolean(user.emailVerified),
            role: user.role ?? "customer",
            twoFactorEnabled: Boolean(user.twoFactorEnabled),
          }}
          linked={accounts.map((a) => a.providerId)}
          accountPath={getPathname({ href: "/account", locale })}
          homePath={getPathname({ href: "/", locale })}
        />
      </section>

      <div className="flex items-center gap-4">
        <Link href="/proposals" className="text-sm text-fg-primary underline">
          Go to proposals
        </Link>
      </div>
    </main>
  );
}
