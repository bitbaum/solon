import {
  AllocationStatus,
  AuditEventType,
  MemberStatus,
  PolicyStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { allocationMessage, verifyMessage } from "@/lib/bitcoin/message";
import { CONTRIBUTION_POLICY_KEY, DEFAULT_CONTRIBUTION_POLICY } from "@/lib/config/contribution";
import {
  canonicalSplit,
  parseContributionPolicy,
  splitHash,
  splitViolations,
  splitsSchema,
  type ContributionPolicy,
  type Splits,
} from "./policy";
import {
  aggregateAllocations,
  standingOf,
  type AllocationAggregate,
  type Standing,
} from "./aggregate";

export * from "./policy";
export * from "./aggregate";

/**
 * Contribution allocation: the right to say which government your own
 * contribution goes to.
 *
 * The division of labour is the design. The organization votes the **bounds**
 * — the tiers, their floors and ceilings, the fallback — as ordinary policy
 * content, through an ALLOCATION_POLICY session like any other. The individual
 * declares their **split inside those bounds**, and that half has no vote and
 * no administrator behind it: the only thing in this file that can write a
 * member's split is a Bitcoin signature that recovers to that member's own
 * address.
 *
 * That asymmetry is deliberate and is what makes this a right. A majority can
 * decide that at least a fifth of every contribution goes federal. A majority
 * cannot decide where *your* remaining four fifths go, because there is no
 * code path that expresses it.
 */

/** The bounds in force, with where they came from. */
export interface PolicyInForce {
  policy: ContributionPolicy;
  /** Enacted version, or null when the code default is in force. */
  version: number | null;
  /** The APPROVED session that legitimated this version, when there is one. */
  approvedBySessionId: string | null;
  /**
   * True when an enacted policy version exists but no longer parses — the
   * organization's own content is unusable and the default is standing in.
   * Surfaced rather than swallowed: members are being held to bounds nobody
   * voted for, and they should be told.
   */
  enactedContentUnreadable: boolean;
}

/**
 * The bounds an organization's members are currently held to.
 *
 * Falls back to `DEFAULT_CONTRIBUTION_POLICY` when nothing has been enacted,
 * which is the widest legal policy — an organization that has not voted on
 * this constrains nobody.
 */
export async function policyInForce(organizationId: string): Promise<PolicyInForce> {
  const row = await prisma.policy.findFirst({
    where: { organizationId, key: CONTRIBUTION_POLICY_KEY, status: PolicyStatus.ACTIVE },
    orderBy: { version: "desc" },
  });
  if (!row) {
    return {
      policy: DEFAULT_CONTRIBUTION_POLICY,
      version: null,
      approvedBySessionId: null,
      enactedContentUnreadable: false,
    };
  }

  const parsed = parseContributionPolicy(row.content);
  if (!parsed) {
    return {
      policy: DEFAULT_CONTRIBUTION_POLICY,
      version: null,
      approvedBySessionId: null,
      enactedContentUnreadable: true,
    };
  }
  return {
    policy: parsed,
    version: row.version,
    approvedBySessionId: row.approvedBySessionId,
    enactedContentUnreadable: false,
  };
}

/** One member's declaration as the public record shows it. */
export interface DeclarationRecord {
  memberId: string;
  displayName: string;
  memberType: string;
  address: string;
  weight: number;
  standing: Standing;
  splits: Splits | null;
  version: number | null;
  policyVersion: number | null;
  declaredAt: Date | null;
  /** Everything stopping this declaration from counting, when it does not. */
  violations: string[];
}

export interface AllocationReport extends PolicyInForce {
  aggregate: AllocationAggregate;
  declarations: DeclarationRecord[];
  /** Watch-only addresses tagged to each tier, so the split is checkable on-chain. */
  tierSources: Record<string, { label: string; address: string }[]>;
}

/**
 * The organization's contribution split: the bounds in force, the effective
 * weighted allocation, and every member's position in it.
 *
 * Declarations are public for the same reason votes are — a split that only
 * the member and the server can see is one the server could misreport with
 * nobody able to tell. Each row carries the signature that produced it, so the
 * aggregate is recomputable by anyone who disagrees with it.
 */
export async function allocationReport(organizationId: string): Promise<AllocationReport> {
  const inForce = await policyInForce(organizationId);
  const { tiers } = inForce.policy;

  const [members, sources] = await Promise.all([
    prisma.member.findMany({
      where: { organizationId, status: MemberStatus.ACTIVE },
      orderBy: { joinedAt: "asc" },
      include: {
        allocations: {
          where: { status: AllocationStatus.ACTIVE },
          orderBy: { version: "desc" },
          take: 1,
        },
      },
    }),
    prisma.treasurySource.findMany({
      where: { organizationId, NOT: { tierKey: null } },
      orderBy: { createdAt: "asc" },
      select: { label: true, address: true, tierKey: true },
    }),
  ]);

  const declarations: DeclarationRecord[] = members.map((member) => {
    const active = member.allocations[0];
    const parsed = active ? splitsSchema.safeParse(active.splits) : null;
    const splits = parsed?.success ? parsed.data : null;
    const weight = Number(member.votingWeight);
    const standing = standingOf({ memberId: member.id, weight, splits }, tiers);

    return {
      memberId: member.id,
      displayName: member.displayName,
      memberType: member.memberType,
      address: member.bitcoinAddress,
      weight,
      standing,
      splits,
      version: active?.version ?? null,
      policyVersion: active?.policyVersion ?? null,
      declaredAt: active?.declaredAt ?? null,
      violations: splits ? splitViolations(splits, tiers) : [],
    };
  });

  const tierSources: Record<string, { label: string; address: string }[]> = {};
  for (const tier of tiers) tierSources[tier.key] = [];
  for (const source of sources) {
    const key = source.tierKey;
    if (key && tierSources[key]) {
      tierSources[key].push({ label: source.label, address: source.address });
    }
  }

  return {
    ...inForce,
    aggregate: aggregateAllocations(
      declarations.map((d) => ({
        memberId: d.memberId,
        weight: d.weight,
        splits: d.splits,
      })),
      inForce.policy,
    ),
    declarations,
    tierSources,
  };
}

export interface DeclareAllocationInput {
  orgSlug: string;
  /** The member's Bitcoin address — the only identity claim that matters here. */
  address: string;
  splits: unknown;
  /** Bitcoin signed-message signature over allocationMessage(). */
  signature: string;
}

/**
 * Why a declaration was refused — stated, not inferred.
 *
 * The checks deliberately run before the cryptography (see below), so
 * "verified: false" covers both "your signature is wrong" and "we never got as
 * far as your signature". Collapsing those into one flag makes the transport
 * layer report a malformed split as an authentication failure, which sends the
 * caller looking at their wallet for a problem that is in their arithmetic.
 */
export type DeclineReason =
  /** No such organization. */
  | "not_found"
  /** The split is malformed, or breaks the bounds in force. */
  | "invalid_split"
  /** The signature does not recover to the claimed address. */
  | "bad_signature"
  /** It verified, but that address is not an active member here. */
  | "not_a_member"
  /** A concurrent declaration won the race for this version number. */
  | "conflict";

export interface DeclareAllocationResult {
  stored: boolean;
  verified: boolean;
  declined?: DeclineReason;
  reason?: string;
  /** Every bound the split failed, so one submission fixes all of them. */
  violations?: string[];
  recoveredAddress?: string;
  version?: number;
  policyVersion?: number | null;
  aggregate?: AllocationAggregate;
}

/**
 * Declare — or re-declare — a member's own contribution split.
 *
 * The order of the checks is the security argument. The split is validated
 * against the bounds *before* the signature is checked, so an out-of-range
 * submission never reaches the crypto; then the signature is verified against
 * the message the server rebuilt from the split it validated, never against
 * anything the caller supplied; and only then is the address resolved to a
 * member. At no point is a claimed identity trusted, and there is no branch
 * here that writes a split for an address whose key did not sign it.
 *
 * Re-declaring supersedes rather than overwrites: version n+1 is inserted and
 * n is marked SUPERSEDED in the same transaction, so "what did they direct
 * last spring" stays answerable, with the signature that answered it.
 */
export async function declareAllocation(
  input: DeclareAllocationInput,
): Promise<DeclareAllocationResult> {
  const org = await prisma.organization.findUnique({ where: { slug: input.orgSlug } });
  if (!org) {
    return { stored: false, verified: false, declined: "not_found", reason: "organization not found" };
  }

  const parsedSplits = splitsSchema.safeParse(input.splits);
  if (!parsedSplits.success) {
    return {
      stored: false,
      verified: false,
      declined: "invalid_split",
      reason: "a split is whole percentage points per tier, e.g. {\"local\":40,\"state\":35,\"federal\":25}",
    };
  }
  const splits = parsedSplits.data;

  const inForce = await policyInForce(org.id);
  if (inForce.enactedContentUnreadable) {
    return {
      stored: false,
      verified: false,
      declined: "invalid_split",
      reason:
        "the enacted contribution policy cannot be read, so there are no bounds to declare under — this needs a new ALLOCATION_POLICY decision",
    };
  }

  const violations = splitViolations(splits, inForce.policy.tiers);
  if (violations.length > 0) {
    return {
      stored: false,
      verified: false,
      declined: "invalid_split",
      reason: "the split does not satisfy the bounds in force",
      violations,
    };
  }

  const hash = splitHash(splits);
  const message = allocationMessage({
    orgSlug: input.orgSlug,
    memberAddress: input.address,
    policyVersion: inForce.version,
    split: canonicalSplit(splits),
    hash,
  });
  const verification = verifyMessage(message, input.address, input.signature);
  if (!verification.valid) {
    return {
      stored: false,
      verified: false,
      declined: "bad_signature",
      reason: verification.reason ?? "signature does not match the address",
      recoveredAddress: verification.recoveredAddress,
    };
  }

  const member = await prisma.member.findFirst({
    where: {
      organizationId: org.id,
      bitcoinAddress: input.address,
      status: MemberStatus.ACTIVE,
    },
  });
  if (!member) {
    return {
      stored: false,
      verified: true,
      declined: "not_a_member",
      reason: "address is not an active member of this organization",
    };
  }

  try {
    const declared = await prisma.$transaction(async (tx) => {
      // Read the current version inside the transaction: two declarations
      // racing would otherwise both read n and both try to write n+1. The
      // unique index on [memberId, version] is what actually decides it — this
      // read just means the loser fails on a constraint instead of silently
      // producing a second live split for one person.
      const current = await tx.contributionAllocation.findFirst({
        where: { memberId: member.id },
        orderBy: { version: "desc" },
      });
      const version = (current?.version ?? 0) + 1;

      await tx.contributionAllocation.updateMany({
        where: { memberId: member.id, status: AllocationStatus.ACTIVE },
        data: { status: AllocationStatus.SUPERSEDED },
      });

      const row = await tx.contributionAllocation.create({
        data: {
          organizationId: org.id,
          memberId: member.id,
          version,
          splits: splits as Prisma.InputJsonValue,
          policyVersion: inForce.version,
          contentHash: hash,
          signedMessage: message,
          signature: input.signature,
          status: AllocationStatus.ACTIVE,
        },
      });

      await tx.auditEvent.create({
        data: {
          organizationId: org.id,
          eventType: AuditEventType.ALLOCATION_DECLARED,
          actorMemberId: member.id,
          subjectType: "contribution_allocation",
          subjectId: row.id,
          payload: {
            version,
            policyVersion: inForce.version,
            splits: splits as Prisma.InputJsonValue,
            contentHash: hash,
            weight: Number(member.votingWeight),
            supersededVersion: current?.version ?? null,
          },
        },
      });
      return row;
    });

    return {
      stored: true,
      verified: true,
      version: declared.version,
      policyVersion: inForce.version,
      aggregate: (await allocationReport(org.id)).aggregate,
    };
  } catch {
    return {
      stored: false,
      verified: true,
      declined: "conflict",
      reason: "a competing declaration was recorded a moment ago — re-read the split and sign again",
    };
  }
}

/**
 * Every version a member has declared, newest first. The point of keeping the
 * superseded rows: this is the answer to "what were they directing at the
 * time", and each row still carries the signature that proves it.
 */
export async function allocationHistory(organizationId: string, address: string) {
  const member = await prisma.member.findFirst({
    where: { organizationId, bitcoinAddress: address },
    select: { id: true, displayName: true, bitcoinAddress: true },
  });
  if (!member) return null;

  const versions = await prisma.contributionAllocation.findMany({
    where: { memberId: member.id },
    orderBy: { version: "desc" },
  });
  return { member, versions };
}
