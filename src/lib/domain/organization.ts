import { and, asc, count, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  AuditEventType,
  KeyCustody,
  MemberStatus,
  MemberType,
  auditEvents,
  members,
  organizations,
} from "@/lib/db/schema";
import { organizationMessage, verifyMessage } from "@/lib/bitcoin/message";
import { verifyLokiGrant, type LokiGrant } from "@/lib/loki-grant";
import { descriptionProblem, nameProblem, slugProblem } from "./organization-rules";

/**
 * Founding an organization.
 *
 * THE LINE THIS DRAWS
 *
 * Creating an organization is permissionless; acting within one is governed.
 * Requiring a vote to create an organization would be circular — there is no
 * electorate to vote in yet — and making it an operator's decision would make
 * Solon something the studio grants rather than something people use. Until
 * this existed, the only way a second organization could come to exist was a
 * developer writing a SQL migration, which does not survive a second builder.
 *
 * What makes it safe to leave open is the thing that makes the founding seat
 * safe in membership.ts: proof instead of permission. The founder is a
 * recognized OrangeCat identity (optionally also signing with a Bitcoin key),
 * and the organization, the founding seat and both audit events are written in ONE
 * transaction. There is no instant at which an organization exists with an
 * unclaimed founding seat someone else could take.
 *
 * Everything after founding — admitting members, spending, changing the rules —
 * goes through the vote spine exactly as it does for organization #1.
 */

/**
 * How many organizations one identity may found.
 *
 * Founding costs nothing, so without a ceiling one account could script
 * thousands of organizations. This is an abuse floor, not a
 * policy about how much a builder should run: high enough that no real person
 * meets it, low enough that a runaway script stops quickly. It is read inside
 * the founding transaction but not serialized against it, so two simultaneous
 * foundings at the ceiling can both land — acceptable for a floor whose job is
 * to bound a script, not to be exact.
 */
export const MAX_FOUNDED_PER_ACTOR = 10;

export interface CreateOrganizationInput {
  slug: string;
  name: string;
  description?: string | null;
  /** OrangeCat actor id from the session — never taken from the request body. */
  actorId: string;
  founderName: string;
  /**
   * Optional: the founder's Bitcoin key, proven by a signature over
   * organizationMessage(). Without one the founder's seat is held by their
   * OrangeCat identity alone.
   */
  founderKey?: { address: string; signature: string } | null;
  /** Loki vouching that this actor owns a project, when the organization governs one. */
  grant?: LokiGrant | null;
  now?: Date;
}

export type CreateOrganizationRefusal =
  "invalid" | "bad_signature" | "bad_grant" | "slug_taken" | "project_taken" | "founding_limit";

export interface CreateOrganizationResult {
  created: boolean;
  verified: boolean;
  /** Machine-readable, so the API maps it to a status without parsing prose. */
  refusal?: CreateOrganizationRefusal;
  reason?: string;
  slug?: string;
  memberId?: string;
  claimedProject?: string | null;
}

/** A unique-constraint violation's constraint name, or null. Drizzle wraps pg errors. */
function uniqueViolation(e: unknown): string | null {
  for (const candidate of [e, (e as { cause?: unknown } | null)?.cause]) {
    const pg = candidate as { code?: string; constraint?: string } | null | undefined;
    if (pg?.code === "23505") return pg.constraint ?? "unknown";
  }
  return null;
}

export async function createOrganization(
  input: CreateOrganizationInput,
): Promise<CreateOrganizationResult> {
  const slug = input.slug.trim();
  const name = input.name.trim();
  const description = input.description?.trim() || null;

  const problem =
    slugProblem(slug) ??
    nameProblem(input.name) ??
    descriptionProblem(description) ??
    (input.founderName.trim().length < 2 ? "use a display name of at least 2 characters" : null);
  if (problem) return { created: false, verified: false, refusal: "invalid", reason: problem };

  // A grant that is PRESENT but fails refuses the founding outright. Creating the
  // organization anyway, unattributed, would leave someone who came from their
  // project page believing it is linked when it is not.
  let claimedProject: string | null = null;
  if (input.grant) {
    const verdict = verifyLokiGrant(input.grant, input.actorId, {
      secret: process.env.SOLON_WEBHOOK_SECRET,
      nowSecs: Math.floor((input.now ?? new Date()).getTime() / 1000),
    });
    if (!verdict.valid) {
      return { created: false, verified: false, refusal: "bad_grant", reason: verdict.reason };
    }
    claimedProject = verdict.project;
  }

  const key = input.founderKey ?? null;
  const message = key
    ? organizationMessage({
        slug,
        name,
        actorId: input.actorId,
        founderAddress: key.address,
        project: claimedProject,
      })
    : null;
  if (key && message) {
    const verification = verifyMessage(message, key.address, key.signature);
    if (!verification.valid) {
      return {
        created: false,
        verified: false,
        refusal: "bad_signature",
        reason: verification.reason ?? "signature does not match the address",
      };
    }
  }

  try {
    const result = await db.transaction(async (tx) => {
      const [{ founded }] = await tx
        .select({ founded: count() })
        .from(auditEvents)
        .innerJoin(members, eq(auditEvents.actorMemberId, members.id))
        .where(
          and(
            eq(auditEvents.eventType, AuditEventType.ORG_CREATED),
            eq(members.ocActorId, input.actorId),
          ),
        );
      if (founded >= MAX_FOUNDED_PER_ACTOR) throw new Error("FOUNDING_LIMIT");

      const [org] = await tx
        .insert(organizations)
        .values({ slug, name, description, claimedProject })
        .returning();

      const [founder] = await tx
        .insert(members)
        .values({
          organizationId: org.id,
          displayName: input.founderName.trim(),
          memberType: MemberType.HUMAN,
          keyCustody: key ? KeyCustody.SELF : null,
          bitcoinAddress: key?.address ?? null,
          ocActorId: input.actorId,
          status: MemberStatus.ACTIVE,
        })
        .returning();

      await tx.insert(auditEvents).values([
        {
          organizationId: org.id,
          eventType: AuditEventType.ORG_CREATED,
          actorMemberId: founder.id,
          subjectType: "organization",
          subjectId: org.id,
          payload: {
            slug,
            name,
            claimedProject,
            proof: key ? "BIP137" : "ACCOUNT",
            ...(key
              ? { founderAddress: key.address, signedMessage: message, signature: key.signature }
              : {}),
            note: "founded on proof, not permission — any recognized OrangeCat identity may found an organization; everything after founding is decided by vote",
          },
        },
        {
          organizationId: org.id,
          eventType: AuditEventType.MEMBER_ADDED,
          actorMemberId: founder.id,
          subjectType: "member",
          subjectId: founder.id,
          payload: {
            displayName: founder.displayName,
            memberType: MemberType.HUMAN,
            bitcoinAddress: founder.bitcoinAddress,
            genesis: true,
            note: "founding human seat — granted in the same transaction that created the organization, so it can never be claimed by anyone but the founder. Later admissions go through MEMBERSHIP votes.",
          },
        },
      ]);

      return { org, founder };
    });

    return {
      created: true,
      verified: true,
      slug: result.org.slug,
      memberId: result.founder.id,
      claimedProject,
    };
  } catch (e) {
    if (e instanceof Error && e.message === "FOUNDING_LIMIT") {
      return {
        created: false,
        verified: true,
        refusal: "founding_limit",
        reason: `one identity may found at most ${MAX_FOUNDED_PER_ACTOR} organizations`,
      };
    }
    const constraint = uniqueViolation(e);
    if (constraint === "organizations_slug_key") {
      return {
        created: false,
        verified: true,
        refusal: "slug_taken",
        reason: `an organization at "${slug}" already exists — choose another address`,
      };
    }
    if (constraint === "organizations_claimed_project_key") {
      return {
        created: false,
        verified: true,
        refusal: "project_taken",
        reason: `the project "${claimedProject}" is already governed by an organization`,
      };
    }
    throw e;
  }
}

/**
 * Every organization, as public record: which exist, and which Loki project
 * each governs by consent. Loki's register reads this instead of probing one
 * slug at a time — which could only ever find the names it already knew.
 */
export function listPublicOrganizations() {
  return db
    .select({
      slug: organizations.slug,
      name: organizations.name,
      claimedProject: organizations.claimedProject,
      createdAt: organizations.createdAt,
    })
    .from(organizations)
    .orderBy(asc(organizations.createdAt));
}
