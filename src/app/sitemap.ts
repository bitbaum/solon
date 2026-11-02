import type { MetadataRoute } from "next";
import { sql } from "drizzle-orm";
import { LAW_AUTHORITIES } from "@/lib/config/law";
import { db } from "@/lib/db/client";
import { SITE } from "@/lib/law/site";

export const dynamic = "force-dynamic";

const PER_SITEMAP = 5000;

/**
 * Room for 100,000 acts. The list is fixed, not counted: counting would need the database
 * while the site is built, where there is none. A file past the last act is an empty list.
 */
const SITEMAP_COUNT = 21;

/** Sitemap 0 lists the law's entry pages and every place; the others list the acts, 5,000 to a file. */
export async function generateSitemaps() {
  return Array.from({ length: SITEMAP_COUNT }, (_, id) => ({ id }));
}

export default async function sitemap(props: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const id = Number(await props.id);
  if (id === 0) {
    return [
      { url: `${SITE}/law` },
      { url: `${SITE}/law/ask` },
      { url: `${SITE}/law/coverage` },
      ...LAW_AUTHORITIES.map((a) => ({ url: `${SITE}/law/place/${a.key}` })),
    ];
  }
  const rows = await db.execute(sql`
    SELECT id FROM legal_acts WHERE in_force ORDER BY id
    LIMIT ${PER_SITEMAP} OFFSET ${(id - 1) * PER_SITEMAP}
  `);
  return (rows.rows as { id: string }[]).map((r) => ({ url: `${SITE}/law/${r.id}` }));
}
