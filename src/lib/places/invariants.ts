/**
 * The invariant engine (design §8.3, step 6): generic checks, parameterised by
 * a pack's level declarations, run on the state an import would leave behind.
 * Pure. Any problem aborts the run, so the database never holds a hierarchy
 * the pack says is impossible.
 */
import type { CountryPack } from "@/lib/config/places/schema";

export interface PlaceNode {
  id: string;
  levelKey: string | null;
  /** How problems name the place: an identifier, never a database id alone. */
  label: string;
}

/** A current `part_of` edge. */
export interface ParentEdge {
  childId: string;
  parentId: string;
}

export function hierarchyProblems(
  pack: CountryPack,
  nodes: readonly PlaceNode[],
  edges: readonly ParentEdge[],
): string[] {
  const problems: string[] = [];
  const levels = new Map(pack.levels.map((level) => [level.key, level]));
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const parentsOf = new Map<string, string[]>();
  for (const edge of edges) {
    parentsOf.set(edge.childId, [...(parentsOf.get(edge.childId) ?? []), edge.parentId]);
  }

  for (const node of nodes) {
    const level = node.levelKey ? levels.get(node.levelKey) : undefined;
    if (!level) {
      problems.push(`${node.label}: level "${node.levelKey}" is not a level of pack "${pack.key}"`);
      continue;
    }
    const parents = parentsOf.get(node.id) ?? [];
    if (level.parent === null) {
      if (parents.length > 0) {
        const kind = level.overlaps ? `overlaps "${level.overlaps}"` : "is the root";
        problems.push(`${node.label}: level "${level.key}" ${kind} and is part of nothing`);
      }
      continue;
    }
    if (parents.length !== 1) {
      problems.push(
        `${node.label}: a ${level.key} needs exactly one current parent, has ${parents.length}`,
      );
      continue;
    }
    const parent = byId.get(parents[0]!);
    if (!parent) {
      problems.push(`${node.label}: its parent is not a place of pack "${pack.key}"`);
    } else if (parent.levelKey !== level.parent) {
      problems.push(
        `${node.label}: a ${level.key} is part of a ${level.parent}, not of a ${parent.levelKey} (${parent.label})`,
      );
    }
  }

  const inReportedLoop = new Set<string>();
  const parentOf = (id: string) => parentsOf.get(id)?.[0];
  for (const node of nodes) {
    const seen = new Set<string>();
    let cursor: string | undefined = node.id;
    while (cursor !== undefined && !seen.has(cursor)) {
      seen.add(cursor);
      cursor = parentOf(cursor);
    }
    if (cursor === undefined || inReportedLoop.has(cursor)) {
      continue;
    }
    const loop: string[] = [];
    for (
      let member: string | undefined = cursor;
      member !== undefined && !loop.includes(member);
      member = parentOf(member)
    ) {
      loop.push(member);
      inReportedLoop.add(member);
    }
    const labels = loop.map((id) => byId.get(id)?.label ?? id);
    problems.push(`${labels[0]}: is its own ancestor (${[...labels, labels[0]].join(" → ")})`);
  }
  return problems;
}
