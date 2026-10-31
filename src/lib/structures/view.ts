/**
 * The structures comparison (design: docs/design/2026-10-structures-as-data.md
 * §1, §3): the same rows for every structure, each fact checked against the
 * provisions it cites. Pure: the loader reads the provisions, this decides
 * what may be shown. No score; a fact whose words the law no longer holds is
 * missing, not stale.
 */
import { createHash } from "node:crypto";
import {
  STRUCTURE_ROWS,
  type StructureCitation,
  type StructureKind,
  type StructureRow,
  type StructureValue,
} from "@/lib/config/structures";

/** A provision as the register holds it today. */
export interface ProvisionText {
  heading: string;
  text: string;
  sourceUrl: string | null;
}

export const provisionKey = (c: Pick<StructureCitation, "act" | "path">) => `${c.act}#${c.path}`;

/**
 * `holds`: the words are there and the provision is as it was read.
 * `amended`: the provision has changed since, and still says it.
 * `missing`: the register has no such provision today, or it no longer says it.
 */
export type CitationStatus = "holds" | "amended" | "missing";

const squash = (s: string) => s.replace(/\s+/g, " ").trim();

export const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");

export function citationStatus(cite: StructureCitation, provision: ProvisionText | undefined) {
  if (!provision || !squash(provision.text).includes(squash(cite.quote))) return "missing";
  return sha256(provision.text) === cite.sha256 ? "holds" : "amended";
}

export interface CheckedCitation extends StructureCitation {
  status: Exclude<CitationStatus, "missing">;
  heading: string;
  sourceUrl: string | null;
}

/** One cell: the fact and the provisions behind it, or null when it is missing. */
export interface StructureCell {
  value: StructureValue;
  cites: CheckedCitation[];
}

export interface StructureColumn {
  key: string;
  place: string;
  act: string;
}

export interface StructureTable {
  columns: StructureColumn[];
  rows: { row: StructureRow; cells: (StructureCell | null)[] }[];
}

export function structureTable(
  kinds: readonly StructureKind[],
  provisions: ReadonlyMap<string, ProvisionText>,
): StructureTable {
  const cell = (kind: StructureKind, row: StructureRow): StructureCell | null => {
    const fact = kind.facts.find((f) => f.row === row);
    if (!fact) return null;
    const cites: CheckedCitation[] = [];
    for (const c of fact.cites) {
      const provision = provisions.get(provisionKey(c));
      const status = citationStatus(c, provision);
      // Every provision it cites must still say it, or the fact is not shown.
      if (status === "missing" || !provision) return null;
      cites.push({ ...c, status, heading: provision.heading, sourceUrl: provision.sourceUrl });
    }
    return { value: fact.value, cites };
  };
  return {
    columns: kinds.map(({ key, place, act }) => ({ key, place, act })),
    rows: STRUCTURE_ROWS.map((row) => ({ row, cells: kinds.map((k) => cell(k, row)) })),
  };
}

/** Every provision the register cites, once. */
export const citedProvisions = (kinds: readonly StructureKind[]) => [
  ...new Map(
    kinds.flatMap((k) => k.facts.flatMap((f) => f.cites)).map((c) => [provisionKey(c), c]),
  ).values(),
];
