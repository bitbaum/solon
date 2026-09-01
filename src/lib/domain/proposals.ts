import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  AuditEventType,
  MemberStatus,
  MemberType,
  agentApiKeys,
  auditEvents,
  members,
  organizations,
  proposals,
  type DecisionCategory,
  type VotingMethod,
} from "@/lib/db/schema";
import { proposalMessage, verifyMessage } from "@/lib/bitcoin/message";
import { canonicalJson, contentHashOf, sha256Hex } from "@/lib/domain/canonical";
import { optionsSchema, type BallotOption } from "@/lib/domain/methods/types";
import { methodId } from "@/lib/domain/methods/db-enum";
import { methodSpec } from "@/lib/domain/methods";

export interface CreateProposalInput {
  orgSlug: string;
  category: DecisionCategory;
  title: string;
  /** Markdown rationale. Not signature-bound — the binding artifacts are title + contentHash. */
  body: string;
  policyKey?: string | null;
  proposedContent?: unknown;
  /** How this should be decided. Omitted falls back to the org's profile. */
  method?: VotingMethod | null;
  /** The answer space for multi-option methods: [{key, label}, …]. */
  options?: BallotOption[] | null;
  target?: string | null;
  proposerAddress: string;
  /** Bitcoin signed-message signature over proposalMessage() by the proposer. */
  signature: string;
  /** Transport auth, required for AGENT proposers (`sk_solon_…`). */
  apiKey?: string | null;
}

export interface CreateProposalResult {
  created: boolean;
  verified: boolean;
  reason?: string;
  proposalId?: string;
  contentHash?: string;
}

/**
 * File a proposal. The Bitcoin signature is the authorization: the proposer is
 * whoever the signature recovers to, and for policy proposals the signature
 * binds the sha256 of the exact proposed content — nothing can be swapped
 * after signing. Agents may propose in ANY category (the electorate only gates
 * voting), but must additionally present their transport API key.
 */
export async function createProposal(input: CreateProposalInput): Promise<CreateProposalResult> {
  const hasPolicyKey = input.policyKey != null && input.policyKey !== "";
  const hasContent = input.proposedContent !== undefined;
  if (hasPolicyKey !== hasContent) {
    return {
      created: false,
      verified: false,
      reason:
        "policyKey and proposedContent must be provided together — a policy change needs both",
    };
  }

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, input.orgSlug),
  });
  if (!org) return { created: false, verified: false, reason: "organization not found" };

  // Validate the answer space before it is signed over: an options list that
  // cannot be voted on is not something a member should be asked to endorse.
  let options: BallotOption[] | null = null;
  if (input.options != null && input.options.length > 0) {
    const parsedOptions = optionsSchema.safeParse(input.options);
    if (!parsedOptions.success) {
      return {
        created: false,
        verified: false,
        reason: parsedOptions.error.issues.map((i) => i.message).join("; "),
      };
    }
    options = parsedOptions.data;
  }
  if (input.method) {
    const spec = methodSpec(methodId(input.method));
    if (spec.needsOptions && (options?.length ?? 0) < 2) {
      return {
        created: false,
        verified: false,
        reason: `${spec.label} needs at least two options`,
      };
    }
  }

  const contentHash = hasContent ? contentHashOf(input.proposedContent) : null;
  const optionsHash = options ? sha256Hex(canonicalJson(options)) : null;
  const message = proposalMessage({
    orgSlug: input.orgSlug,
    category: input.category,
    title: input.title,
    proposerAddress: input.proposerAddress,
    contentHash,
    optionsHash,
  });
  const verification = verifyMessage(message, input.proposerAddress, input.signature);
  if (!verification.valid) {
    return {
      created: false,
      verified: false,
      reason: verification.reason ?? "signature does not match proposer address",
    };
  }

  const member = await db.query.members.findFirst({
    where: and(
      eq(members.organizationId, org.id),
      eq(members.bitcoinAddress, input.proposerAddress),
      eq(members.status, MemberStatus.ACTIVE),
    ),
  });
  if (!member) {
    return {
      created: false,
      verified: true,
      reason: "address is not an active member of this organization",
    };
  }

  if (member.memberType === MemberType.AGENT) {
    if (!input.apiKey) {
      return {
        created: false,
        verified: true,
        reason: "agent proposers must present their API key",
      };
    }
    const key = await db.query.agentApiKeys.findFirst({
      where: and(
        eq(agentApiKeys.memberId, member.id),
        eq(agentApiKeys.keyHash, sha256Hex(input.apiKey)),
        isNull(agentApiKeys.revokedAt),
      ),
    });
    if (!key) {
      return {
        created: false,
        verified: true,
        reason: "API key does not belong to this agent member or is revoked",
      };
    }
  }

  const proposal = await db.transaction(async (tx) => {
    const [p] = await tx
      .insert(proposals)
      .values({
        organizationId: org.id,
        category: input.category,
        title: input.title,
        body: input.body,
        policyKey: hasPolicyKey ? input.policyKey : null,
        proposedContent: hasContent ? input.proposedContent : null,
        target: input.target ?? null,
        contentHash,
        method: input.method ?? null,
        options: options ?? null,
        proposerMemberId: member.id,
        proposerSignature: input.signature,
      })
      .returning();
    await tx.insert(auditEvents).values({
      organizationId: org.id,
      eventType: AuditEventType.PROPOSAL_CREATED,
      actorMemberId: member.id,
      subjectType: "proposal",
      subjectId: p.id,
      payload: {
        category: input.category,
        title: input.title,
        memberType: member.memberType,
        ...(contentHash ? { policyKey: input.policyKey, contentHash } : {}),
      },
    });
    return p;
  });

  return {
    created: true,
    verified: true,
    proposalId: proposal.id,
    ...(contentHash ? { contentHash } : {}),
  };
}
