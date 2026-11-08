/**
 * Saved chart views: a specification stored under the sha256 of its canonical
 * JSON, so the same view always has the same address and a proposal that
 * links one cites exactly what its author saw. A proposal whose text links a
 * saved view gets that view attached as evidence when it is filed.
 */
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "@/lib/db/client";
import { proposalEvidence, statisticViews } from "@/lib/db/statistics-schema";
import { canonicalJson, sha256Hex } from "@/lib/domain/canonical";
import { axisSchema } from "./axes";

export const viewSpecSchema = z.object({
  version: z.literal(1),
  metric: z.string().min(1).max(100),
  /** The places shown, by the code the page uses (ISO 3166-1 for a country); empty: every place. */
  places: z.array(z.string().regex(/^[A-Za-z0-9_-]{1,40}$/)).max(50),
  from: z.number().int().min(1900).max(2200).nullable(),
  to: z.number().int().min(1900).max(2200).nullable(),
  /** An axis read with weights, when the view is of one. */
  axis: z
    .object({ definition: axisSchema, weights: z.record(z.string(), z.number().min(0).max(10)) })
    .nullable(),
});
export type ViewSpec = z.infer<typeof viewSpecSchema>;

/** The spec in its one canonical form: places sorted and unique. */
export const normalizeSpec = (spec: ViewSpec): ViewSpec => ({
  ...spec,
  places: [...new Set(spec.places)].sort(),
});

export const viewHash = (spec: ViewSpec): string => sha256Hex(canonicalJson(normalizeSpec(spec)));

/** The path a saved view is opened at, without the locale. */
export const viewPath = (sha256: string) => `/statistics/view/${sha256}`;

export async function saveView(
  db: Database,
  spec: ViewSpec,
  createdBy: string | null,
): Promise<string> {
  const normal = normalizeSpec(viewSpecSchema.parse(spec));
  const sha256 = viewHash(normal);
  await db
    .insert(statisticViews)
    .values({ sha256, spec: normal, createdBy })
    .onConflictDoNothing({ target: statisticViews.sha256 });
  return sha256;
}

export async function loadView(
  db: Database,
  sha256: string,
): Promise<{ spec: ViewSpec; recordedAt: Date } | null> {
  if (!/^[0-9a-f]{64}$/.test(sha256)) return null;
  const [row] = await db.select().from(statisticViews).where(eq(statisticViews.sha256, sha256));
  return row ? { spec: viewSpecSchema.parse(row.spec), recordedAt: row.recordedAt } : null;
}

/** Every saved-view hash a text links, in order, once each. */
export function citedViewHashes(text: string): string[] {
  return [
    ...new Set([...text.matchAll(/\/statistics\/view\/([0-9a-f]{64})\b/g)].map((m) => m[1]!)),
  ];
}

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

/** Attach to a proposal, as evidence, every saved view its text links that exists. */
export async function attachCitedViews(
  tx: Tx | Database,
  proposalId: string,
  text: string,
  attachedBy: string,
): Promise<string[]> {
  const cited = citedViewHashes(text);
  if (cited.length === 0) return [];
  const existing = (
    await tx
      .select({ sha256: statisticViews.sha256 })
      .from(statisticViews)
      .where(inArray(statisticViews.sha256, cited))
  ).map((r) => r.sha256);
  if (existing.length === 0) return [];
  await tx
    .insert(proposalEvidence)
    .values(existing.map((viewSha256) => ({ proposalId, viewSha256, attachedBy })))
    .onConflictDoNothing();
  return existing;
}

/** The saved views attached to a proposal. */
export async function evidenceOf(db: Database, proposalId: string) {
  return db
    .select({
      sha256: statisticViews.sha256,
      spec: statisticViews.spec,
      attachedAt: proposalEvidence.recordedAt,
    })
    .from(proposalEvidence)
    .innerJoin(statisticViews, eq(statisticViews.sha256, proposalEvidence.viewSha256))
    .where(and(eq(proposalEvidence.proposalId, proposalId)))
    .orderBy(proposalEvidence.recordedAt);
}
