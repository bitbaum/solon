import { prisma } from "@/lib/db";

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
 * roster change. ocActorId is globally unique, so one actor maps to at
 * most one member.
 */
export function memberForActor(actorId: string) {
  return prisma.member.findUnique({
    where: { ocActorId: actorId },
    include: { organization: { select: { slug: true, name: true } } },
  });
}
