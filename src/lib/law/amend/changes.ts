/**
 * An amendment's changes: what they are, whether they fit the text they were
 * written against, what the law would read like with them, and the redline
 * (design: docs/design/2026-11-amending-the-law.md).
 *
 * Pure functions over plain data, so every rule here is tested without a
 * database. The three operations follow Akoma Ntoso's textual modifications:
 * substitute (`replace`), insert, repeal.
 */
import { diffWordsWithSpace } from "diff";
import { z } from "zod";
import { sha256Hex } from "@/lib/domain/canonical";

/** One provision as Solon holds it: the publisher's anchor, its heading, its text. */
export interface Provision {
  path: string;
  heading: string;
  text: string;
}

/** The limits a change is held to; generous for law, tight enough to refuse abuse. */
export const LIMITS = {
  changes: 200,
  heading: 500,
  text: 50_000,
  path: 200,
  title: 200,
  rationale: 20_000,
} as const;

const sha256 = z.string().regex(/^[0-9a-f]{64}$/, "a sha256 in lowercase hex");
const path = z.string().min(1).max(LIMITS.path);
const text = z.string().max(LIMITS.text);

export const ChangeSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("replace"),
    path,
    baseHash: sha256,
    heading: z.string().max(LIMITS.heading).optional(),
    text,
  }),
  z.object({
    op: z.literal("insert"),
    /** The provision the new one follows; null puts it first. */
    after: path.nullable(),
    heading: z.string().min(1).max(LIMITS.heading),
    text: text.min(1),
  }),
  z.object({ op: z.literal("repeal"), path, baseHash: sha256 }),
]);
export type Change = z.infer<typeof ChangeSchema>;

export const ChangesSchema = z.array(ChangeSchema).min(1).max(LIMITS.changes);

/** The hash a change is pinned to: sha256 of the provision's text, exactly as held. */
export const provisionHash = (provision: Pick<Provision, "text">): string =>
  sha256Hex(provision.text);

/** Text compared the way a reader compares it: line ends and outer space do not count. */
const normalized = (s: string) => s.replace(/\r\n?/g, "\n").trim();

export type ChangeProblem =
  | { change: number; kind: "unknown_path"; path: string }
  | { change: number; kind: "duplicate_path"; path: string }
  | { change: number; kind: "stale_base"; path: string }
  | { change: number; kind: "no_effect"; path: string }
  | { change: number; kind: "unknown_anchor"; after: string };

/**
 * Whether these changes fit the base they claim: every path exists, every
 * pinned hash matches, no path is touched twice, every insert follows a
 * provision that exists, and every replacement changes something. An empty
 * list means they fit.
 */
export function checkChanges(
  base: readonly Provision[],
  changes: readonly Change[],
): ChangeProblem[] {
  const byPath = new Map(base.map((p) => [p.path, p]));
  const touched = new Set<string>();
  const problems: ChangeProblem[] = [];
  changes.forEach((change, i) => {
    if (change.op === "insert") {
      if (change.after !== null && !byPath.has(change.after)) {
        problems.push({ change: i, kind: "unknown_anchor", after: change.after });
      }
      return;
    }
    const held = byPath.get(change.path);
    if (!held) {
      problems.push({ change: i, kind: "unknown_path", path: change.path });
      return;
    }
    if (touched.has(change.path)) {
      problems.push({ change: i, kind: "duplicate_path", path: change.path });
      return;
    }
    touched.add(change.path);
    if (provisionHash(held) !== change.baseHash) {
      problems.push({ change: i, kind: "stale_base", path: change.path });
      return;
    }
    if (
      change.op === "replace" &&
      normalized(change.text) === normalized(held.text) &&
      (change.heading === undefined || normalized(change.heading) === normalized(held.heading))
    ) {
      problems.push({ change: i, kind: "no_effect", path: change.path });
    }
  });
  return problems;
}

/** One provision of the amended law, with what happened to it. */
export type AmendedProvision =
  | { status: "unchanged"; path: string; heading: string; text: string }
  | {
      status: "replaced";
      path: string;
      heading: string;
      text: string;
      before: Provision;
    }
  | { status: "repealed"; path: string; heading: string; text: string; before: Provision }
  | { status: "inserted"; path: null; heading: string; text: string };

/**
 * The law as it would read with the changes, in the act's order: replaced
 * provisions in place, repealed ones kept and marked (a reader must see what
 * goes), inserted ones after their anchor in the order they were written.
 * Call `checkChanges` first; this assumes the changes fit.
 */
export function applyChanges(
  base: readonly Provision[],
  changes: readonly Change[],
): AmendedProvision[] {
  const edits = new Map<string, Change>();
  const inserts = new Map<string | null, Change[]>();
  for (const change of changes) {
    if (change.op === "insert") {
      inserts.set(change.after, [...(inserts.get(change.after) ?? []), change]);
    } else {
      edits.set(change.path, change);
    }
  }
  const inserted = (after: string | null): AmendedProvision[] =>
    (inserts.get(after) ?? []).flatMap((c) =>
      c.op === "insert"
        ? [{ status: "inserted" as const, path: null, heading: c.heading, text: c.text }]
        : [],
    );

  const out: AmendedProvision[] = [...inserted(null)];
  for (const provision of base) {
    const edit = edits.get(provision.path);
    if (!edit) {
      out.push({ status: "unchanged", ...provision });
    } else if (edit.op === "repeal") {
      out.push({ status: "repealed", ...provision, before: provision });
    } else if (edit.op === "replace") {
      out.push({
        status: "replaced",
        path: provision.path,
        heading: edit.heading ?? provision.heading,
        text: edit.text,
        before: provision,
      });
    }
    out.push(...inserted(provision.path));
  }
  return out;
}

/** A run of words in a redline: kept, struck or added. */
export interface RedlinePart {
  kind: "same" | "removed" | "added";
  text: string;
}

/**
 * The redline from one text to another, word by word, keeping the spacing so
 * the joined parts read as the text. Computed, never typed: the redline is a
 * view of the change, not part of it.
 */
export function redline(before: string, after: string): RedlinePart[] {
  return diffWordsWithSpace(before, after).map((part) => ({
    kind: part.added ? "added" : part.removed ? "removed" : "same",
    text: part.value,
  }));
}

/**
 * Whether a revision written against one text still fits the law as held now:
 * `current` when every change still checks out against `now`, `outdated` with
 * the problems when the law moved under it. A revision whose base version is
 * still the one in force is current by construction; this is what decides
 * when the publisher has issued a new version since.
 */
export function standing(
  now: readonly Provision[],
  changes: readonly Change[],
): { state: "current" } | { state: "outdated"; problems: ChangeProblem[] } {
  // `no_effect` against the new text means the law already says it: still outdated
  // for the proposal (there is nothing left to propose), so it counts.
  const problems = checkChanges(now, changes);
  return problems.length === 0 ? { state: "current" } : { state: "outdated", problems };
}
