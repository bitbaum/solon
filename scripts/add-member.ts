/**
 * Operator bootstrap: register a member (human or agent) in an organization.
 *
 * Membership changes are a HUMANS_ONLY decision category, but the genesis
 * roster has to come from somewhere — this script is that documented,
 * operator-run bootstrap. It runs on the box with DATABASE_URL set and writes
 * a MEMBER_ADDED audit event like every other roster change.
 *
 * Usage:
 *   npx tsx scripts/add-member.ts --org orangecat --name "George" \
 *     --type HUMAN --address <bitcoin-address> [--pubkey <hex>] \
 *     [--system orangecat:cat] [--weight 1] [--mint-key] \
 *     [--oc-actor <orangecat-actor-uuid>]
 *
 * --oc-actor (humans only) links the member to an OrangeCat identity so
 * "Sign in with OrangeCat" recognizes them. The actor id is shown on
 * /account after the person signs in — recognition only; voting authority
 * stays with the Bitcoin key regardless.
 *
 * --mint-key (agents only) generates a transport API key, stores its sha256,
 * and prints the plaintext ONCE — it is never stored or shown again.
 */
import { parseArgs } from "node:util";
import { randomBytes } from "node:crypto";
import { prisma } from "../src/lib/db";
import { sha256Hex } from "../src/lib/domain/canonical";

const { values } = parseArgs({
  options: {
    org: { type: "string" },
    name: { type: "string" },
    type: { type: "string" },
    address: { type: "string" },
    pubkey: { type: "string" },
    system: { type: "string" },
    weight: { type: "string", default: "1" },
    "mint-key": { type: "boolean", default: false },
    "oc-actor": { type: "string" },
  },
});

async function main() {
  const { org, name, type, address } = values;
  if (!org || !name || !type || !address) {
    console.error("required: --org --name --type HUMAN|AGENT --address");
    process.exit(1);
  }
  if (type !== "HUMAN" && type !== "AGENT") {
    console.error(`--type must be HUMAN or AGENT, got ${type}`);
    process.exit(1);
  }
  if (type === "AGENT" && !values.system) {
    console.error("agents need --system (e.g. orangecat:cat) — which system attests this member's votes");
    process.exit(1);
  }
  if (type === "AGENT" && values["oc-actor"]) {
    console.error("--oc-actor is for HUMAN members only — agents are recognized by their API key, not a login");
    process.exit(1);
  }

  const organization = await prisma.organization.findUnique({ where: { slug: org } });
  if (!organization) {
    console.error(`organization "${org}" not found`);
    process.exit(1);
  }

  const existing = await prisma.member.findUnique({
    where: { organizationId_bitcoinAddress: { organizationId: organization.id, bitcoinAddress: address } },
  });
  if (existing) {
    console.log(`member already registered: ${existing.id} (${existing.displayName})`);
    process.exit(0);
  }

  const member = await prisma.$transaction(async (tx) => {
    const m = await tx.member.create({
      data: {
        organizationId: organization.id,
        displayName: name,
        memberType: type,
        // Humans hold their own keys; an agent's key lives in its system's env.
        keyCustody: type === "HUMAN" ? "SELF" : "SERVICE",
        bitcoinAddress: address,
        publicKeyHex: values.pubkey ?? null,
        votingWeight: values.weight,
        system: values.system ?? null,
        ocActorId: values["oc-actor"] ?? null,
      },
    });
    await tx.auditEvent.create({
      data: {
        organizationId: organization.id,
        eventType: "MEMBER_ADDED",
        subjectType: "member",
        subjectId: m.id,
        payload: {
          displayName: name,
          memberType: type,
          bitcoinAddress: address,
          ...(values.system ? { system: values.system } : {}),
          ...(values["oc-actor"] ? { ocActorId: values["oc-actor"] } : {}),
          note: "operator bootstrap — roster changes after genesis go through MEMBERSHIP votes",
        },
      },
    });
    return m;
  });
  console.log(`member created: ${member.id} (${member.displayName}, ${member.memberType})`);

  if (values["mint-key"]) {
    if (type !== "AGENT") {
      console.error("--mint-key is for AGENT members only");
      process.exit(1);
    }
    const plaintext = `sk_solon_${randomBytes(24).toString("hex")}`;
    await prisma.agentApiKey.create({ data: { memberId: member.id, keyHash: sha256Hex(plaintext) } });
    console.log(`API key (shown once, store it in the agent's env now):\n${plaintext}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
