import PageLayout from "@/components/ui/page-layout";
import { prisma } from "@/lib/db";
import { ECOSYSTEM_PILLARS } from "@/lib/config/ecosystem";
import { CATEGORY_ELECTORATE } from "@/lib/config/governance";
import { Electorate, type DecisionCategory } from "@prisma/client";

export const dynamic = "force-dynamic";

const CATEGORY_LABEL: Record<DecisionCategory, string> = {
  ALLOCATION_POLICY: "Allocation policy",
  TREASURY_SPEND: "Treasury spend",
  OPERATIONS: "Operations",
  AID_DISBURSEMENT: "Aid disbursement",
  MEMBERSHIP: "Membership",
  SAFETY: "Safety",
  GOVERNANCE_RULES: "Governance rules",
};

/**
 * The three-pillar page: what Solon governs, for whom, and the live proof.
 * Everything below the fold is rendered straight from the database — the
 * same record the public API serves. If the database is empty, the page
 * says so instead of inventing numbers.
 */
export default async function EcosystemPage() {
  let org = null;
  let members: {
    id: string;
    displayName: string;
    memberType: string;
    system: string | null;
    bitcoinAddress: string;
    status: string;
  }[] = [];
  let policies: { key: string; version: number; content: unknown }[] = [];
  let proposals: {
    id: string;
    title: string;
    category: DecisionCategory;
    status: string;
    session: { id: string; status: string; outcome: string | null } | null;
  }[] = [];
  let dbError = false;

  try {
    org = await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } });
    if (org) {
      [members, policies, proposals] = await Promise.all([
        prisma.member.findMany({
          where: { organizationId: org.id },
          orderBy: { joinedAt: "asc" },
          select: {
            id: true,
            displayName: true,
            memberType: true,
            system: true,
            bitcoinAddress: true,
            status: true,
          },
        }),
        prisma.policy.findMany({
          where: { organizationId: org.id, status: "ACTIVE" },
          orderBy: { key: "asc" },
          select: { key: true, version: true, content: true },
        }),
        prisma.proposal.findMany({
          where: { organizationId: org.id },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            title: true,
            category: true,
            status: true,
            session: {
              select: { id: true, status: true, outcome: true },
            },
          },
        }),
      ]);
    }
  } catch {
    dbError = true;
  }

  const humansOnlyCategories = (
    Object.entries(CATEGORY_ELECTORATE) as [DecisionCategory, Electorate][]
  )
    .filter(([, electorate]) => electorate === Electorate.HUMANS_ONLY)
    .map(([category]) => category);

  return (
    <PageLayout
      title="One Stack, Three Pillars"
      description="OrangeCat is the economy. FleetCrown is the engineering. Solon is where the stack decides."
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-16">
        {/* The three pillars */}
        <section className="grid gap-6 md:grid-cols-3">
          {ECOSYSTEM_PILLARS.map((pillar) => (
            <div
              key={pillar.key}
              className={`rounded-xl border shadow-sm p-6 flex flex-col gap-3 ${
                pillar.key === "solon"
                  ? "bg-[var(--navy)] border-[var(--navy)] text-white"
                  : "bg-white border-gray-200"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h2
                  className={`text-xl font-bold ${
                    pillar.key === "solon" ? "text-white" : "text-[var(--navy)]"
                  }`}
                >
                  {pillar.name}
                </h2>
                <span
                  className={`text-xs font-semibold uppercase tracking-wide ${
                    pillar.key === "solon"
                      ? "text-[var(--solon-orange)]"
                      : "text-gray-500"
                  }`}
                >
                  {pillar.role}
                </span>
              </div>
              <p
                className={`text-sm ${
                  pillar.key === "solon" ? "text-slate-300" : "text-gray-600"
                }`}
              >
                {pillar.description}
              </p>
              <p
                className={`text-sm ${
                  pillar.key === "solon" ? "text-slate-300" : "text-gray-600"
                }`}
              >
                {pillar.tie}
              </p>
              <div className="mt-auto pt-2">
                {pillar.key === "solon" ? (
                  <span className="text-xs text-slate-400">
                    You are here — {pillar.url.replace("https://", "")}
                  </span>
                ) : (
                  <a
                    href={pillar.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-[var(--solon-orange)] hover:text-[var(--solon-orange-dark)]"
                  >
                    {pillar.url.replace("https://", "")} →
                  </a>
                )}
              </div>
            </div>
          ))}
        </section>

        {/* How a decision travels */}
        <section className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-[var(--navy)] text-center mb-6">
            How a decision travels
          </h2>
          <ol className="space-y-3 text-sm text-gray-700">
            {[
              "A member — human, the Cat, or Loki — files a proposal, signed with their own Bitcoin key. Solon never holds anyone's private key.",
              "A voting session opens and snapshots its rules: electorate, threshold, quorum, eligible weight. A past decision stays explainable after the rules change.",
              "Members cast Bitcoin signed-message votes from their own environments. One member, one vote per session, enforced by the database.",
              "The session closes with an outcome — approved, rejected, or expired — and every step lands in the append-only audit trail.",
              "The decision is published as a self-verifying document (/api/v1/decisions/{sessionId}) carrying every signed message, so anyone can recount the tally.",
              "OrangeCat and FleetCrown are notified — and OrangeCat re-verifies every vote signature against its own pinned keys before acting. A decision is evidence, not authority.",
            ].map((step, i) => (
              <li key={i} className="flex gap-3 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--solon-orange)] text-white text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-gray-600 text-center">
            Red lines: {humansOnlyCategories.map((c) => CATEGORY_LABEL[c].toLowerCase()).join(", ")}{" "}
            are decided by humans only. Agents propose anywhere, but can never vote to expand their
            own suffrage.
          </p>
        </section>

        {/* Live governed state */}
        <section className="max-w-3xl mx-auto space-y-8">
          <h2 className="text-2xl font-bold text-[var(--navy)] text-center">
            What is governed here, live
          </h2>
          {dbError && (
            <p className="text-center text-gray-600">
              The governance register is currently unreachable, so no live state can be shown.
            </p>
          )}
          {!dbError && !org && (
            <p className="text-center text-gray-600">
              No organization is registered yet — there is nothing governed to show.
            </p>
          )}
          {org && (
            <>
              <p className="text-sm text-gray-600 text-center">
                Everything below is read from the same database the public API serves — nothing is
                staged.
              </p>

              <div>
                <h3 className="text-lg font-semibold text-[var(--navy)] mb-3">
                  {org.name} — members
                </h3>
                <ul className="space-y-3">
                  {members.map((m) => (
                    <li key={m.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                      <div className="flex items-baseline justify-between gap-4">
                        <span className="font-semibold text-[var(--navy)]">{m.displayName}</span>
                        <span className="text-xs text-gray-500 uppercase tracking-wide">
                          {m.memberType}
                          {m.system ? ` · ${m.system}` : ""} · {m.status}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500 font-mono break-all">
                        {m.bitcoinAddress}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-[var(--navy)] mb-3">Active policies</h3>
                {policies.length === 0 ? (
                  <p className="text-sm text-gray-600">No active policies.</p>
                ) : (
                  <ul className="space-y-3">
                    {policies.map((p) => (
                      <li
                        key={`${p.key}-v${p.version}`}
                        className="bg-white rounded-xl border border-gray-200 shadow-sm p-4"
                      >
                        <div className="flex items-baseline justify-between gap-4">
                          <span className="font-semibold text-[var(--navy)] font-mono text-sm">
                            {p.key}
                          </span>
                          <span className="text-xs text-gray-500">v{p.version}</span>
                        </div>
                        <pre className="mt-2 p-2 rounded-md bg-gray-50 border border-gray-100 text-xs font-mono whitespace-pre-wrap break-all text-gray-700">
                          {JSON.stringify(p.content, null, 2)}
                        </pre>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold text-[var(--navy)] mb-3">Recent proposals</h3>
                {proposals.length === 0 ? (
                  <p className="text-sm text-gray-600">No proposals yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {proposals.map((p) => (
                      <li key={p.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                        <div className="flex items-baseline justify-between gap-4">
                          <span className="font-semibold text-[var(--navy)]">{p.title}</span>
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {CATEGORY_LABEL[p.category]} ·{" "}
                            {p.session?.outcome ?? p.session?.status ?? p.status}
                          </span>
                        </div>
                        {p.session?.outcome && (
                          <a
                            href={`/api/v1/decisions/${p.session.id}`}
                            className="mt-1 inline-block text-xs font-mono text-[var(--solon-orange)] hover:text-[var(--solon-orange-dark)]"
                          >
                            self-verifying decision document →
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </PageLayout>
  );
}
