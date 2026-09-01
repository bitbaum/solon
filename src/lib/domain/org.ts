import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { organizations } from "@/lib/db/schema";

/**
 * Solon is built for many organizations but ships governing one. Until a
 * second exists, "the organization" is the oldest row — resolved here once so
 * the dashboard, the join flow and the proposal form cannot drift onto
 * different definitions of which org the page is about.
 */
export function primaryOrg() {
  return db.query.organizations.findFirst({ orderBy: asc(organizations.createdAt) });
}

/** The one lookup every public org endpoint starts with. */
export function orgBySlug(slug: string) {
  return db.query.organizations.findFirst({ where: eq(organizations.slug, slug) });
}
