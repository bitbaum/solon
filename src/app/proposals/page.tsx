import Link from "next/link";
import { prisma } from "@/lib/db";
import { primaryOrg } from "@/lib/domain/org";

export const metadata = { title: "Proposals — Solon" };
export const dynamic = "force-dynamic";

const STATUS_ACTION: Record<string, string> = {
  DRAFT: "Open it for voting →",
  OPEN: "Cast your vote →",
  CLOSED: "See the result →",
};

export default async function ProposalsPage() {
  const org = await primaryOrg();
  const proposals = org
    ? await prisma.proposal.findMany({
        where: { organizationId: org.id },
        orderBy: { createdAt: "desc" },
        include: { proposer: true, session: true },
      })
    : [];

  return (
    <main className="section-shell py-section-tight">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-display-2 text-fg-primary">Proposals</h1>
          <p className="mt-3 text-fg-secondary">
            Everything {org?.name ?? "this organization"} has been asked to decide.
          </p>
        </div>
        <Link href="/propose" className="btn-primary">
          File a proposal
        </Link>
      </div>

      <div className="mt-12 space-y-3">
        {proposals.length === 0 && (
          <div className="rounded-surface border border-default bg-surface-base p-8 text-center">
            <p className="text-fg-secondary">
              Nothing has been proposed yet. The first one sets the precedent.
            </p>
            <Link href="/propose" className="btn-primary mt-6 inline-flex">
              File the first proposal
            </Link>
          </div>
        )}

        {proposals.map((p) => (
          <Link
            key={p.id}
            href={`/proposals/${p.id}`}
            className="block rounded-surface border border-default bg-surface-base p-5 transition-colors hover:bg-surface-raised"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display text-display-3 text-fg-primary">{p.title}</h2>
                <p className="mt-1 text-sm text-fg-secondary">
                  {p.category.replace(/_/g, " ").toLowerCase()} · filed by {p.proposer.displayName}
                  {p.session?.outcome ? ` · ${p.session.outcome.toLowerCase()}` : ""}
                </p>
              </div>
              <span className="shrink-0 rounded-pill border border-default px-3 py-1 text-xs uppercase tracking-caps text-fg-secondary">
                {p.status}
              </span>
            </div>
            <span className="mt-3 inline-block text-sm text-accent">
              {STATUS_ACTION[p.status] ?? "View →"}
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
