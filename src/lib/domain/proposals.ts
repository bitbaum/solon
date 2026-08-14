import {
  AuditEventType,
  DecisionCategory,
  MemberStatus,
  MemberType,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { proposalMessage, verifyMessage } from "@/lib/bitcoin/message";
import { contentHashOf, sha256Hex } from "@/lib/domain/canonical";

export interface CreateProposalInput {
  orgSlug: string;
  category: DecisionCategory;
  title: string;
  /** Markdown rationale. Not signature-bound — the binding artifacts are title + contentHash. */
  body: string;
  policyKey?: string | null;
  proposedContent?: unknown;
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
      reason: "policyKey and proposedContent must be provided together — a policy change needs both",
    };
  }

  const org = await prisma.organization.findUnique({ where: { slug: input.orgSlug } });
  if (!org) return { created: false, verified: false, reason: "organization not found" };

  const contentHash = hasContent ? contentHashOf(input.proposedContent) : null;
  const message = proposalMessage({
    orgSlug: input.orgSlug,
    category: input.category,
    title: input.title,
    proposerAddress: input.proposerAddress,
    contentHash,
  });
  const verification = verifyMessage(message, input.proposerAddress, input.signature);
  if (!verification.valid) {
    return {
      created: false,
      verified: false,
      reason: verification.reason ?? "signature does not match proposer address",
    };
  }

  const member = await prisma.member.findFirst({
    where: {
      organizationId: org.id,
      bitcoinAddress: input.proposerAddress,
      status: MemberStatus.ACTIVE,
    },
  });
  if (!member) {
    return { created: false, verified: true, reason: "address is not an active member of this organization" };
  }

  if (member.memberType === MemberType.AGENT) {
    if (!input.apiKey) {
      return { created: false, verified: true, reason: "agent proposers must present their API key" };
    }
    const key = await prisma.agentApiKey.findFirst({
      where: { memberId: member.id, keyHash: sha256Hex(input.apiKey), revokedAt: null },
    });
    if (!key) {
      return { created: false, verified: true, reason: "API key does not belong to this agent member or is revoked" };
    }
  }

  const proposal = await prisma.$transaction(async (tx) => {
    const p = await tx.proposal.create({
      data: {
        organizationId: org.id,
        category: input.category,
        title: input.title,
        body: input.body,
        policyKey: hasPolicyKey ? input.policyKey : null,
        proposedContent: hasContent ? (input.proposedContent as Prisma.InputJsonValue) : Prisma.DbNull,
        target: input.target ?? null,
        contentHash,
        proposerMemberId: member.id,
        proposerSignature: input.signature,
      },
    });
    await tx.auditEvent.create({
      data: {
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
      },
    });
    return p;
  });

  return { created: true, verified: true, proposalId: proposal.id, ...(contentHash ? { contentHash } : {}) };
}
