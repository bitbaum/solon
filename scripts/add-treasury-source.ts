/**
 * Operator bootstrap: register a watch-only Bitcoin address as a treasury source.
 *
 * Solon never holds keys. This script only writes the address the public
 * dashboard will look up on mempool.space. Do not invent an address. Do not
 * use a voting member's key as the treasury. Run on the box with DATABASE_URL.
 *
 * Usage:
 *   npx tsx scripts/add-treasury-source.ts --org orangecat \
 *     --label "OrangeCat platform" --address <btc-address>
 */
import { parseArgs } from "node:util";
import { and, eq } from "drizzle-orm";
import { db } from "../src/lib/db/client";
import { organizations, treasurySources } from "../src/lib/db/schema";

const { values } = parseArgs({
  options: {
    org: { type: "string" },
    label: { type: "string" },
    address: { type: "string" },
  },
});

async function main() {
  const { org, label, address } = values;
  if (!org || !label || !address) {
    console.error("required: --org --label --address");
    process.exit(1);
  }

  const organization = await db.query.organizations.findFirst({
    where: eq(organizations.slug, org),
  });
  if (!organization) {
    console.error(`organization "${org}" not found`);
    process.exit(1);
  }

  const existing = await db.query.treasurySources.findFirst({
    where: and(
      eq(treasurySources.organizationId, organization.id),
      eq(treasurySources.address, address),
    ),
  });
  if (existing) {
    console.log(
      `treasury source already registered: ${existing.id} (${existing.label} ${existing.address})`,
    );
    process.exit(0);
  }

  const [source] = await db
    .insert(treasurySources)
    .values({ organizationId: organization.id, label, address })
    .returning();
  console.log(`treasury source created: ${source.id} (${source.label} ${source.address})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$client.end());
