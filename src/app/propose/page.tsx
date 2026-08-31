import Link from "next/link";
import { auth, signIn, authEnabled } from "@/lib/auth";
import { memberForActor } from "@/lib/auth/recognition";
import { primaryOrg } from "@/lib/domain/org";
import FileProposal from "@/components/governance/file-proposal";

export const metadata = { title: "File a proposal — Solon" };
export const dynamic = "force-dynamic";

export default async function ProposePage() {
  const org = await primaryOrg();
  const session = await auth();
  const member = session?.actorId ? await memberForActor(session.actorId) : null;

  if (!org) {
    return (
      <Shell title="File a proposal">
        <p className="text-sm text-fg-secondary">
          No organization is seeded in this environment yet.
        </p>
      </Shell>
    );
  }

  if (!member) {
    return (
      <Shell title="File a proposal">
        <p className="text-sm leading-relaxed text-fg-secondary">
          Proposals are signed by a member, so the record always says who asked for the change. You
          are not on the roster yet.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          {session?.actorId || !authEnabled ? (
            <Link href="/join" className="btn-primary">
              Become a member
            </Link>
          ) : (
            <form
              action={async () => {
                "use server";
                await signIn("orangecat", { redirectTo: "/propose" });
              }}
            >
              <button type="submit" className="btn-primary">
                Sign in with OrangeCat
              </button>
            </form>
          )}
          <Link
            href="/proposals"
            className="text-sm text-fg-secondary transition-colors hover:text-fg-primary"
          >
            Read the open proposals →
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <main className="section-shell py-section-tight">
      <h1 className="text-center font-display text-display-2 text-fg-primary">File a proposal</h1>
      <p className="mx-auto mt-5 max-w-lede text-center text-fg-secondary">
        Filing puts it on the record as a draft. Opening it starts the clock and freezes the rules.
      </p>
      <div className="mx-auto mt-12 max-w-2xl">
        <FileProposal orgSlug={org.slug} memberAddress={member.bitcoinAddress} />
      </div>
    </main>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="section-shell py-section-tight">
      <h1 className="text-center font-display text-display-2 text-fg-primary">{title}</h1>
      <div className="mx-auto mt-12 max-w-2xl rounded-surface border border-default bg-surface-base p-6">
        {children}
      </div>
    </main>
  );
}
