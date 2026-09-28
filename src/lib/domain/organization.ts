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
import {
  DEFAULT_PROFILE,
  isGovernanceProfileId,
  profileFor,
  usesMandates,
  type GovernanceProfileId,
} from "@/lib/config/governance-profiles";
import { mandateEnd } from "./mandate";
import { bodyProblem, descriptionProblem, nameProblem, slugProblem } from "./organization-rules";
import { fetchOrangeCatGroup } from "@/lib/orangecat-group";
import { normalizePlace, type LegalRecord, type Place } from "@/lib/collective-kinds";
import { DEFAULT_COLLECTIVE_KIND, type CollectiveKindId, type LegalStatus } from "@/lib/db/enums";

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
  /**
   * How the organization decides — one of the governance profiles. Chosen at
   * founding because there is nobody else yet to ask; every change after this
   * is a GOVERNANCE_RULES decision taken under the profile chosen here.
   * Omitted = the default, which is what every organization founded before the
   * choice existed got.
   */
  governanceProfile?: GovernanceProfileId | null;
  /**
   * What kind of body this is, where it belongs and what it legally is —
   * validated together by bodyProblem() (organization-rules.ts). Omitted kind
   * = the default every organization founded before kinds existed got.
   */
  kind?: CollectiveKindId | null;
  place?: Partial<Place> | null;
  legal?: Partial<LegalRecord> | null;
  /**
   * The slug of an OrangeCat organisation to bind this body to. Accepted only
   * when OrangeCat says the founder's actor owns it (fetchOrangeCatGroup);
   * the OrangeCat group's own kind and place fill in whatever the founder
   * left blank, so the two records describe one body.
   */
  orangecatGroup?: string | null;
  now?: Date;
}

export type CreateOrganizationRefusal =
  | "invalid"
  | "bad_signature"
  | "bad_grant"
  | "bad_group"
  | "slug_taken"
  | "project_taken"
  | "group_taken"
  | "founding_limit";

export interface CreateOrganizationResult {
  created: boolean;
  verified: boolean;
  /** Machine-readable, so the API maps it to a status without parsing prose. */
  refusal?: CreateOrganizationRefusal;
  reason?: string;
  slug?: string;
  memberId?: string;
  claimedProject?: string | null;
  governanceProfile?: GovernanceProfileId;
  kind?: CollectiveKindId;
  orangecatGroupId?: string | null;
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
    (input.founderName.trim().length < 2 ? "use a display name of at least 2 characters" : null) ??
    (input.governanceProfile != null && !isGovernanceProfileId(input.governanceProfile)
      ? "choose one of the governance profiles"
      : null);
  if (problem) return { created: false, verified: false, refusal: "invalid", reason: problem };
  const governanceProfile: GovernanceProfileId = input.governanceProfile ?? DEFAULT_PROFILE;

  // Binding to an OrangeCat organisation is checked first, because when it
  // holds it may SUPPLY the kind and the place the founder left blank — and a
  // binding that fails refuses the founding outright, for the same reason a
  // failing grant does: nobody should walk away believing two records are one
  // body when they are not.
  let orangecatGroupId: string | null = null;
  let kind: CollectiveKindId = input.kind ?? DEFAULT_COLLECTIVE_KIND;
  let place: Partial<Place> | null = input.place ?? null;
  if (input.orangecatGroup) {
    const bound = await fetchOrangeCatGroup(input.orangecatGroup);
    if (!bound.ok) {
      return { created: false, verified: false, refusal: "bad_group", reason: bound.reason };
    }
    if (bound.group.ownerActorId !== input.actorId) {
      return {
        created: false,
        verified: false,
        refusal: "bad_group",
        reason: "that OrangeCat organisation is not yours to bind",
      };
    }
    orangecatGroupId = bound.group.id;
    if (input.kind == null) kind = bound.group.kind;
    if (!place?.locality && bound.group.place) place = bound.group.place;
  }
  const bodyIssue = bodyProblem({ kind, place, legal: input.legal ?? null });
  if (bodyIssue) return { created: false, verified: false, refusal: "invalid", reason: bodyIssue };
  const legalStatus: LegalStatus = input.legal?.status ?? "informal";
  const normalizedPlace = normalizePlace(place);

  // Under a structure that gives decisions to mandate holders, the founder
  // holds the first mandate — otherwise "one person decides" would open with
  // nobody deciding. Under DELEGATED it carries the profile's term, so the
  // founder's mandate lapses into an election rather than lasting forever.
  const profile = profileFor(governanceProfile);
  const founderMandate = usesMandates(profile);
  const foundedAt = input.now ?? new Date();
  const founderMandateUntil = founderMandate
    ? mandateEnd(null, profile.mandateTermDays, foundedAt)
    : null;

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
        // Signed only when chosen: a founder who took the default signs the
        // same text a founder signed before the choice existed.
        decides: input.governanceProfile ?? null,
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
        .values({
          slug,
          name,
          description,
          claimedProject,
          governanceProfile,
          kind,
          countryCode: normalizedPlace?.country_code ?? null,
          region: normalizedPlace?.region ?? null,
          locality: normalizedPlace?.locality ?? null,
          legalStatus,
          legalForm: input.legal?.legal_form?.trim() || null,
          jurisdiction: input.legal?.jurisdiction?.trim().toUpperCase() || null,
          registerId: input.legal?.register_id?.trim() || null,
          recognisedOn: input.legal?.recognised_on || null,
          orangecatGroupId,
        })
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
          holdsMandate: founderMandate,
          mandateUntil: founderMandateUntil,
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
            governanceProfile,
            kind,
            place: normalizedPlace,
            legalStatus,
            orangecatGroupId,
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
            ...(founderMandate
              ? {
                  holdsMandate: true,
                  mandateUntil: founderMandateUntil?.toISOString() ?? null,
                }
              : {}),
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
      governanceProfile,
      kind,
      orangecatGroupId,
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
    if (constraint === "organizations_orangecat_group_key") {
      return {
        created: false,
        verified: true,
        refusal: "group_taken",
        reason: "that OrangeCat organisation is already bound to an organization here",
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
      governanceProfile: organizations.governanceProfile,
      createdAt: organizations.createdAt,
    })
    .from(organizations)
    .orderBy(asc(organizations.createdAt));
}
