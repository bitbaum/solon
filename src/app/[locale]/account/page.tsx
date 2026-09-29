import { getLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { auth, signOut } from "@/lib/auth";
import { membershipsForActor } from "@/lib/auth/recognition";
import { MemberFace } from "@/components/ui/member-face";
import { orangecatProfileUrl, syncMemberFace } from "@/lib/domain/member-identity";

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

  // The roster carries the person's OrangeCat face; refresh it from this
  // session's claims so a new picture or handle on OrangeCat shows up here
  // without anyone re-typing anything. Names are never rewritten.
  const face = { username: session.ocUsername ?? null, avatarUrl: session.user?.image ?? null };
  await syncMemberFace(session.actorId, face);
  const memberships = await membershipsForActor(session.actorId);
  const profileUrl = orangecatProfileUrl(face.username);

  return (
    <main className="max-w-xl mx-auto py-16">
      <h1 className="headline text-display-3 text-fg-primary mb-8">Account</h1>

      <section className="bg-surface-base border border-default rounded-surface p-6 mb-6">
        <h2 className="text-sm font-semibold text-fg-secondary uppercase tracking-wide mb-4">
          OrangeCat identity
        </h2>
        <div className="mb-4 flex items-center gap-3">
          <MemberFace
            name={session.user?.name ?? "?"}
            username={face.username}
            avatarUrl={face.avatarUrl}
            size={48}
          />
          <div className="min-w-0">
            <p className="font-medium text-fg-primary">{session.user?.name ?? "—"}</p>
            {profileUrl ? (
              <a href={profileUrl} className="text-sm text-fg-secondary underline" rel="noopener">
                @{face.username} on OrangeCat
              </a>
            ) : (
              <p className="text-sm text-fg-secondary">No public OrangeCat page yet</p>
            )}
          </div>
        </div>
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
        <p className="mt-4 text-sm text-fg-secondary">
          Name, picture, email, passkeys and the apps allowed in are all managed in one place:{" "}
          <a
            href={`${process.env.ORANGECAT_OAUTH_ISSUER ?? "https://orangecat.ch"}/settings`}
            className="text-fg-primary underline"
            rel="noopener"
          >
            your OrangeCat settings
          </a>
          . Solon reads them; it never keeps a second copy to edit.
        </p>
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
