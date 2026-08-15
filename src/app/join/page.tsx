import Link from "next/link";
import { auth, signIn, authEnabled } from "@/lib/auth";
import { memberForActor } from "@/lib/auth/recognition";
import { genesisOpen } from "@/lib/domain/membership";
import { primaryOrg } from "@/lib/domain/org";
import ClaimSeat from "@/components/governance/claim-seat";

export const metadata = { title: "Join — Solon" };
export const dynamic = "force-dynamic";

/**
 * Every branch of this page ends in something the visitor can do right now:
 * sign in, claim the seat, cast a vote, or read the roster. "Nothing to do
 * here" is not one of the states.
 */
export default async function JoinPage() {
  const org = await primaryOrg();
  if (!org) {
    return (
      <Shell title="Join">
        <Card>
          <p className="text-sm text-fg-secondary">
            No organization is seeded in this environment yet.
          </p>
          <Actions>
            <Secondary href="/governance/audit">Browse the audit trail</Secondary>
          </Actions>
        </Card>
      </Shell>
    );
  }

  const session = await auth();

  if (!session?.actorId) {
    return (
      <Shell title="Become a member">
        <Card>
          <p className="text-sm leading-relaxed text-fg-secondary">
            Membership needs two things: an OrangeCat identity, so the roster
            says who you are, and a Bitcoin key, so your votes verify. Start
            with the first.
          </p>
          <Actions>
            {authEnabled ? (
              <form
                action={async () => {
                  "use server";
                  await signIn("orangecat", { redirectTo: "/join" });
                }}
              >
                <button type="submit" className="btn-primary">
                  Sign in with OrangeCat
                </button>
              </form>
            ) : (
              <p className="text-sm text-fg-secondary">
                Sign-in is not configured in this environment.
              </p>
            )}
            <Secondary href="/governance/audit">Or just read the record →</Secondary>
          </Actions>
        </Card>
      </Shell>
    );
  }

  const member = await memberForActor(session.actorId);
  if (member) {
    return (
      <Shell title="You are a member">
        <Card>
          <dl className="space-y-2 text-sm">
            <Row label="Roster name" value={member.displayName} />
            <Row label="Organization" value={member.organization.name} />
            <Row label="Voting weight" value={member.votingWeight.toString()} />
            <Row label="Address" value={member.bitcoinAddress} mono />
          </dl>
          <Actions>
            <Link href="/dashboard/voting" className="btn-primary">
              Go to the current vote
            </Link>
            <Secondary href="/propose">File a proposal →</Secondary>
          </Actions>
        </Card>
      </Shell>
    );
  }

  const open = await genesisOpen(org.slug);
  if (!open) {
    return (
      <Shell title="Admission is by vote">
        <Card>
          <p className="text-sm leading-relaxed text-fg-secondary">
            {org.name} has seated members, so new admissions are decided by a
            MEMBERSHIP vote rather than claimed. You are signed in and can read
            everything: the roster, every proposal, every signature, and the
            treasury.
          </p>
          <Actions>
            <Link href="/governance/audit" className="btn-primary">
              Read the record
            </Link>
            <Secondary href="/dashboard/voting">See the current vote →</Secondary>
          </Actions>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell title="Claim the founding seat">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-surface border border-default bg-surface-raised p-5 text-sm leading-relaxed text-fg-secondary">
          <p>
            {org.name} has no human members yet. A membership vote cannot open
            without one, so the founding seat is granted on proof instead of by
            decision — sign a message with a Bitcoin key you control and the
            seat is yours. It is recorded in the audit trail as a founding
            grant, and every admission after it is an ordinary vote.
          </p>
        </div>
        <ClaimSeat
          orgSlug={org.slug}
          actorId={session.actorId}
          defaultName={session.user?.name ?? "Member"}
        />
      </div>
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="section-shell py-section-tight">
      <h1 className="text-center font-display text-display-2 text-fg-primary">{title}</h1>
      <div className="mt-12">{children}</div>
    </main>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl rounded-surface border border-default bg-surface-base p-6">
      {children}
    </div>
  );
}

function Actions({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 flex flex-wrap items-center gap-4">{children}</div>;
}

function Secondary({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-sm text-fg-secondary transition-colors hover:text-fg-primary">
      {children}
    </Link>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-fg-secondary">{label}</dt>
      <dd className={`text-fg-primary ${mono ? "break-all font-mono text-xs" : "font-medium"}`}>
        {value}
      </dd>
    </div>
  );
}
