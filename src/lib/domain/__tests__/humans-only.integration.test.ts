/**
 * Which categories only people may vote on — each organization's own rule —
 * against a real database: the column default, an organization that opens
 * everything to its agents, one that closes more than the default, and the
 * list changed by a GOVERNANCE_RULES decision without reaching back into a
 * vote already open.
 *
 * Runs only with INTEGRATION=1 against a migrated database (same harness as the
 * vote spine). Plain `pnpm test` skips it.
 */
import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { DEFAULT_HUMANS_ONLY_CATEGORIES } from "@/lib/config/governance";
import { AuditEventType, DecisionCategory, Electorate, SessionOutcome } from "@/lib/db/enums";
import { db } from "@/lib/db/client";
import { auditEvents, members, organizations } from "@/lib/db/schema";
import { generateKeyPair, proposalMessage, signMessage, voteMessage } from "@/lib/bitcoin/message";
import { contentHashOf } from "@/lib/domain/canonical";
import { createProposal } from "@/lib/domain/proposals";
import { closeSession, openSession, submitVote } from "@/lib/domain/voting";

const RUN = process.env.INTEGRATION === "1";

type Pair = ReturnType<typeof generateKeyPair>;

/** An organization with two people and one agent, all holding keys. */
async function org(humansOnlyCategories?: DecisionCategory[]) {
  const slug = `ho-${randomUUID().slice(0, 8)}`;
  const [row] = await db
    .insert(organizations)
    .values({
      slug,
      name: `Electorate ${slug}`,
      ...(humansOnlyCategories ? { humansOnlyCategories } : {}),
    })
    .returning();
  const alice = generateKeyPair();
  const bob = generateKeyPair();
  const agent = generateKeyPair();
  for (const [name, pair, type] of [
    ["Alice", alice, "HUMAN"],
    ["Bob", bob, "HUMAN"],
    ["Cat", agent, "AGENT"],
  ] as const) {
    await db.insert(members).values({
      organizationId: row.id,
      displayName: name,
      memberType: type,
      keyCustody: type === "HUMAN" ? "SELF" : "SERVICE",
      bitcoinAddress: pair.address,
      publicKeyHex: pair.publicKeyHex,
      system: type === "AGENT" ? "test:agent" : null,
    });
  }
  return { slug, org: row, alice, bob, agent };
}

async function file(
  slug: string,
  by: Pair,
  category: DecisionCategory,
  effect?: unknown,
): Promise<{ created: boolean; proposalId?: string; reason?: string }> {
  const title = `A ${category} decision`;
  return createProposal({
    orgSlug: slug,
    category,
    title,
    body: "Integration.",
    ...(effect ? { effect } : {}),
    by: {
      via: "key",
      address: by.address,
      signature: signMessage(
        proposalMessage({
          orgSlug: slug,
          category,
          title,
          proposerAddress: by.address,
          ...(effect ? { contentHash: contentHashOf(effect) } : {}),
        }),
        by.privateKeyHex,
      ),
    },
  });
}

function vote(sessionId: string, by: Pair) {
  return submitVote(sessionId, {
    by: {
      via: "key",
      address: by.address,
      signature: signMessage(
        voteMessage({ sessionId, choice: "yes", memberAddress: by.address }),
        by.privateKeyHex,
      ),
    },
    ballot: { method: "single_choice", choice: "yes" },
  });
}

describe.runIf(RUN)("humans-only categories (database integration)", () => {
  it("gives a new organization today's four, so it decides exactly as before", async () => {
    const { org: row } = await org();
    expect([...row.humansOnlyCategories].sort()).toEqual(
      [...DEFAULT_HUMANS_ONLY_CATEGORIES].sort(),
    );
  });

  it("refuses to store a category that does not exist", async () => {
    await expect(
      db.execute(
        sql`INSERT INTO organizations (id, slug, name, humans_only_categories) VALUES (${randomUUID()}, ${`ho-${randomUUID().slice(0, 8)}`}, 'Bad', ARRAY['ROBOT_RIGHTS']::text[])`,
      ),
    ).rejects.toThrow();
  });

  it("lets agents vote on the rules themselves where the organization's list is empty", async () => {
    const { slug, alice, agent } = await org([]);
    const filed = await file(slug, alice, DecisionCategory.GOVERNANCE_RULES);
    expect(filed, filed.reason).toMatchObject({ created: true });

    const session = await openSession(filed.proposalId!);
    expect(session.electorate).toBe(Electorate.ALL_MEMBERS);
    expect(session.eligibleCount).toBe(3);

    const agentVote = await vote(session.id, agent);
    expect(agentVote, agentVote.reason).toMatchObject({ stored: true, verified: true });
  });

  it("keeps agents out of a category the organization added to its list", async () => {
    const { slug, alice, agent } = await org([
      ...DEFAULT_HUMANS_ONLY_CATEGORIES,
      DecisionCategory.OPERATIONS,
    ]);
    const filed = await file(slug, alice, DecisionCategory.OPERATIONS);
    expect(filed, filed.reason).toMatchObject({ created: true });

    const session = await openSession(filed.proposalId!);
    expect(session.electorate).toBe(Electorate.HUMANS_ONLY);
    expect(session.eligibleCount).toBe(2);

    const agentVote = await vote(session.id, agent);
    expect(agentVote).toMatchObject({ stored: false, verified: true });
    expect(agentVote.reason).toMatch(/humans-only/);
  });

  it("changes the list only by a governance-rules decision, never reaching an open vote", async () => {
    const { slug, org: row, alice, bob, agent } = await org();

    const misfiled = await file(slug, alice, DecisionCategory.OPERATIONS, {
      kind: "humans_only",
      categories: [],
    });
    expect(misfiled).toMatchObject({ created: false });

    // A safety vote opened under the default list, before the change.
    const before = await file(slug, alice, DecisionCategory.SAFETY);
    const openBefore = await openSession(before.proposalId!);
    expect(openBefore.electorate).toBe(Electorate.HUMANS_ONLY);

    const change = await file(slug, alice, DecisionCategory.GOVERNANCE_RULES, {
      kind: "humans_only",
      categories: [],
    });
    expect(change, change.reason).toMatchObject({ created: true });
    const session = await openSession(change.proposalId!);
    // Voted under the list the organization already has: people only.
    expect(session.electorate).toBe(Electorate.HUMANS_ONLY);
    expect((await vote(session.id, agent)).stored).toBe(false);
    await vote(session.id, alice);
    await vote(session.id, bob);
    expect((await closeSession(session.id)).outcome).toBe(SessionOutcome.APPROVED);

    const after = await db.query.organizations.findFirst({ where: eq(organizations.id, row.id) });
    expect(after?.humansOnlyCategories).toEqual([]);
    const changed = await db.query.auditEvents.findFirst({
      where: and(
        eq(auditEvents.organizationId, row.id),
        eq(auditEvents.eventType, AuditEventType.ELECTORATE_CHANGED),
      ),
    });
    expect(changed?.payload).toMatchObject({ to: [] });
    expect((changed?.payload as { from: string[] }).from.sort()).toEqual(
      [...DEFAULT_HUMANS_ONLY_CATEGORIES].sort(),
    );

    // The vote already open keeps the electorate it opened with.
    const refused = await vote(openBefore.id, agent);
    expect(refused).toMatchObject({ stored: false });
    expect(refused.reason).toMatch(/humans-only/);

    // A vote opened now follows the new list.
    const later = await file(slug, alice, DecisionCategory.SAFETY);
    const openLater = await openSession(later.proposalId!);
    expect(openLater.electorate).toBe(Electorate.ALL_MEMBERS);
    expect((await vote(openLater.id, agent)).stored).toBe(true);
  });
});
