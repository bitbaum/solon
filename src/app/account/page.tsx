import Link from "next/link";
import { auth, signIn, signOut, authEnabled } from "@/lib/auth";
import { memberForActor } from "@/lib/auth/recognition";

export const metadata = { title: "Account — Solon" };
export const dynamic = "force-dynamic";

/**
 * The one personal page. It answers exactly two questions — who does
 * OrangeCat say you are, and are you a voting member — and is honest about
 * the boundary between them: membership is granted by a vote (or the
 * documented operator bootstrap), never by signing up.
 */
export default async function AccountPage() {
  const session = await auth();

  if (!session?.actorId) {
    return (
      <main className="max-w-xl mx-auto py-24 text-center">
        <h1 className="text-2xl font-bold text-fg-primary mb-4">Account</h1>
        <p className="text-fg-secondary mb-8">
          Solon has no accounts of its own — no passwords, no registration.
          Sign in with OrangeCat to be recognized; voting itself never needs
          a login, only a Bitcoin signature.
        </p>
        {authEnabled ? (
          <form
            action={async () => {
              "use server";
              await signIn("orangecat", { redirectTo: "/account" });
            }}
          >
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-medium bg-surface-raised text-fg-primary rounded-control hover:bg-surface-overlay transition-colors"
            >
              Sign in with OrangeCat
            </button>
          </form>
        ) : (
          <p className="text-sm text-fg-secondary">
            Sign-in is not configured in this environment.
          </p>
        )}
      </main>
    );
  }

  const member = await memberForActor(session.actorId);

  return (
    <main className="max-w-xl mx-auto py-16">
      <h1 className="text-2xl font-bold text-fg-primary mb-8">Account</h1>

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
        {member ? (
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-fg-secondary">Member</dt>
              <dd className="text-fg-primary font-medium">{member.displayName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-fg-secondary">Organization</dt>
              <dd className="text-fg-primary">{member.organization.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-fg-secondary">Voting weight</dt>
              <dd className="text-fg-primary">{member.votingWeight.toString()}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-fg-secondary">Bitcoin address</dt>
              <dd className="text-fg-primary font-mono text-xs break-all">
                {member.bitcoinAddress}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-fg-secondary">
            You are signed in as an observer. Membership in a Solon
            organization is granted by a governance vote, not by signing up —
            there is nothing to register here. Everything on this site is
            already fully readable to you.
          </p>
        )}
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
        <Link href="/governance/voting" className="text-sm text-fg-primary underline">
          Go to voting
        </Link>
      </div>
    </main>
  );
}
