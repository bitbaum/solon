import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { members } from "@/lib/db/schema";

/**
 * Login on Solon is recognition, not authority. A session shows you your
 * memberships and pre-fills your address; every vote and proposal still
 * requires a Bitcoin signature. There are therefore no passwords, no
 * registration, and no auth tables here — the only identity provider is
 * OrangeCat (the stack's identity root), and the only thing a session
 * stores is the OrangeCat actor id.
 */

export interface OrangeCatProfile {
  sub?: string | null;
  email?: string | null;
}

/**
 * OrangeCat's lead CTA is "start instantly" — anonymous accounts with no
 * email and an auto-generated username. Those are fine for browsing OC,
 * but binding one to a governance identity would make the member roster
 * unauditable (nobody can say who the account is). Recognizable = has a
 * stable actor id AND an email.
 */
export function isRecognizableProfile(profile: OrangeCatProfile | undefined | null): boolean {
  return Boolean(profile?.sub && profile.email);
}

/**
 * Membership is resolved from the database on every request instead of
 * being baked into the session token: a 30-day JWT must never outlive a
 * roster change.
 *
 * Scoped to one organization. An OrangeCat identity may hold a seat in more
 * than one organization — at most one per organization, enforced by
 * members_organization_id_oc_actor_id_key — so "the member for this actor"
 * only means something once you say whose roster. Until 2026-09-15 the
 * identity was globally unique and this lookup took no organization, which
 * would have shown a builder who founded a second organization the first
 * one's seat on the second one's pages.
 */
export function memberForActor(actorId: string, organizationId: string) {
  return db.query.members.findFirst({
    where: and(eq(members.ocActorId, actorId), eq(members.organizationId, organizationId)),
    with: { organization: { columns: { slug: true, name: true } } },
  });
}

/** Every seat this identity holds, oldest first — for the one page that lists them all. */
export function membershipsForActor(actorId: string) {
  return db.query.members.findMany({
    where: eq(members.ocActorId, actorId),
    with: { organization: { columns: { slug: true, name: true } } },
    orderBy: asc(members.joinedAt),
  });
}
