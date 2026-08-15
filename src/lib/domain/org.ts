import { prisma } from "@/lib/db";

/**
 * Solon is built for many organizations but ships governing one. Until a
 * second exists, "the organization" is the oldest row — resolved here once so
 * the dashboard, the join flow and the proposal form cannot drift onto
 * different definitions of which org the page is about.
 */
export function primaryOrg() {
  return prisma.organization.findFirst({ orderBy: { createdAt: "asc" } });
}
