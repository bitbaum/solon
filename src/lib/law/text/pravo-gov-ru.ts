/**
 * What Russia's official publication portal lists (config PRAVO_GOV_RU), read
 * into register rows. Pure: a page of the portal's `/api/Documents` in, acts
 * out, so the reader is tested on the portal's own answers.
 *
 * Every act is listed once per publication. The Constitution is published
 * again whenever it is amended, so its publications are one act, linked to
 * the newest; every other act is its own publication.
 */
import { z } from "zod";
import { PRAVO_GOV_RU, type ActKind } from "@/lib/config/law";
import type { ActRow } from "../register/import";

const item = z
  .object({
    eoNumber: z.string().regex(/^\d{16}$/),
    complexName: z.string(),
    number: z.string().nullable(),
    documentDate: z.string().nullable(),
    documentTypeId: z.string(),
  })
  .loose();

export const documentsPage = z
  .object({
    itemsTotalCount: z.number().int().min(0),
    pagesTotalCount: z.number().int().min(0),
    currentPage: z.number().int().min(1),
    items: z.array(item),
  })
  .loose();
export type DocumentsPage = z.infer<typeof documentsPage>;
export type ListedDocument = z.infer<typeof item>;

export type PravoBlock = (typeof PRAVO_GOV_RU.blocks)[number];

/** The page of the portal's listing for one block, its document types and a page number from 1. */
export function documentsUrl(block: PravoBlock, page: number): string {
  const types = block.types.map((t) => `DocumentTypes=${t.id}`).join("&");
  return PRAVO_GOV_RU.documentsUrl
    .replace("{block}", block.block)
    .replace("{types}", types)
    .replace("{page}", String(page));
}

/** The portal's name for an act, on one line: "Закон … от 08.10.2026 № 57-РЗ "О …"". */
export const actTitle = (complexName: string) => complexName.replace(/\s+/g, " ").trim();

/** The number the act was given, when it has one ("б/н" is "without a number"). */
export function actNumber(doc: ListedDocument): string | null {
  const n = doc.number?.trim() ?? "";
  if (!n || n === "0" || /^б\/н$/i.test(n)) return null;
  const year = doc.documentDate?.slice(0, 4);
  return year && /^\d{4}$/.test(year) ? `${year}/${n}` : null;
}

/** The register's rows for one block's listing: one act per publication, the Constitution once. */
export function rowsOf(
  block: PravoBlock,
  docs: readonly ListedDocument[],
): {
  rows: ActRow[];
  skipped: { row: string; reason: string }[];
} {
  const kindOf = new Map<string, ActKind>(block.types.map((t) => [t.id, t.kind]));
  const rows = new Map<string, ActRow>();
  const skipped: { row: string; reason: string }[] = [];
  const page = (eo: string) => PRAVO_GOV_RU.pageUrl.replace("{eo}", eo);
  // Newest first, so the Constitution keeps its newest publication.
  const sorted = [...docs].sort((a, b) => b.eoNumber.localeCompare(a.eoNumber));
  for (const doc of sorted) {
    const kind = kindOf.get(doc.documentTypeId);
    if (!kind) {
      skipped.push({ row: doc.eoNumber, reason: "a document type this block does not read" });
      continue;
    }
    const title = actTitle(doc.complexName);
    if (!title) {
      skipped.push({ row: doc.eoNumber, reason: "the portal lists it with no name" });
      continue;
    }
    const constitution = kind === "constitution";
    const ref = constitution ? `${block.authority}:constitution` : doc.eoNumber;
    if (rows.has(ref)) continue;
    const number = constitution ? null : actNumber(doc);
    rows.set(ref, {
      authority: block.authority,
      kind,
      // The portal lists what was published and says nothing of what is still in force.
      inForce: true,
      statusStated: false,
      title,
      locale: PRAVO_GOV_RU.locale,
      identity: { scheme: "publisher_ref", value: `${PRAVO_GOV_RU.key}:${ref}` },
      systematicNumber: null,
      more: [
        { scheme: "official_url", value: page(doc.eoNumber) },
        ...(number ? [{ scheme: "act_number", value: number }] : []),
      ],
    });
  }
  return { rows: [...rows.values()], skipped };
}
