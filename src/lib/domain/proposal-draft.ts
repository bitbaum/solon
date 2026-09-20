/**
 * A proposal that arrives pre-filled — from OrangeCat's "Govern it with Solon"
 * button, from a ratification link CI mints, or from any link that carries
 * `title`, `body` and `category` in its query.
 *
 * Until this existed, OrangeCat's button sent `?from=orangecat&entity_type=…&
 * entity_id=…&title=…` to the dashboard, and nothing read it. The visitor had
 * pressed a button that promised to govern a specific thing, and landed on a
 * page that had forgotten which thing. That is the one experience this stack
 * must never produce: a person who did the right thing and is now stuck.
 *
 * This module is pure so the page, the form and the tests share one reading of
 * the query, and so the sign-in and join round-trips can carry the same query
 * back here unchanged — the draft survives everything between the click and
 * the signature.
 */

import { ECOSYSTEM_PILLARS } from "@/lib/config/ecosystem";
import {
  CATEGORY_ELECTORATE,
  CATEGORY_MEANING,
  CATEGORY_THRESHOLD,
  VOTING_WINDOW_DAYS,
} from "@/lib/config/governance";
import { DecisionCategory, Electorate, VoteThreshold } from "@/lib/db/enums";

export type Query = Record<string, string | string[] | undefined>;

/** Same bounds the API enforces, so a pre-fill never produces an unfilable form. */
export const TITLE_MAX = 200;
export const BODY_MAX = 20000;

/**
 * Categories a member can file from the UI. Policy changes are deliberately
 * absent: they must carry an exact JSON body whose sha256 is bound into the
 * signature, and a free-text box would invite signing content that does not
 * parse. Those go through the API, where the content is explicit.
 */
export const FILEABLE_CATEGORIES = [
  DecisionCategory.OPERATIONS,
  DecisionCategory.MEMBERSHIP,
  DecisionCategory.SAFETY,
  DecisionCategory.TREASURY_SPEND,
  DecisionCategory.AID_DISBURSEMENT,
  DecisionCategory.GOVERNANCE_RULES,
] as const satisfies readonly DecisionCategory[];

export type FileableCategory = (typeof FILEABLE_CATEGORIES)[number];

/**
 * The cheapest category to decide — all members, simple majority — and so the
 * right default for a proposal whose category nobody has stated yet. Filing in
 * a humans-only category by accident wastes a week; filing in OPERATIONS by
 * accident wastes a click on the selector.
 */
export const DEFAULT_CATEGORY: FileableCategory = DecisionCategory.OPERATIONS;

export function isFileableCategory(value: string): value is FileableCategory {
  return (FILEABLE_CATEGORIES as readonly string[]).includes(value);
}

/**
 * What choosing a category commits the proposer to, in one line, read from the
 * same table the vote spine snapshots at open. The form used to carry its own
 * copy of these facts ("Humans only, supermajority") — the sentence a person
 * reads before signing must be the rule that binds them, not a paraphrase of it.
 */
export function categoryConsequence(category: DecisionCategory): string {
  const who =
    CATEGORY_ELECTORATE[category] === Electorate.HUMANS_ONLY ? "Humans only" : "All members vote";
  const bar =
    CATEGORY_THRESHOLD[category] === VoteThreshold.SUPERMAJORITY
      ? "supermajority"
      : "simple majority";
  return `${CATEGORY_MEANING[category]} ${who}, ${bar}, ${VOTING_WINDOW_DAYS} days.`;
}

export interface ProposalOrigin {
  product: "orangecat";
  /** The public page on the product this proposal is about. */
  url: string;
  entityType: string;
}

export interface ProposalDraft {
  category: FileableCategory;
  title: string;
  body: string;
  /** Where the draft came from, for the "pre-filled from" line. Null when it was typed here. */
  origin: ProposalOrigin | null;
}

const one = (v: string | string[] | undefined): string => (Array.isArray(v) ? v[0] : v) ?? "";

/** A same-origin path: starts with one slash, so it cannot smuggle a host. */
export function isSafePath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//");
}

function orangeCatOrigin(): string {
  return ECOSYSTEM_PILLARS.find((p) => p.key === "orangecat")?.url ?? "https://orangecat.ch";
}

/** `investment` → `Investment`; a slug the reader can say out loud. */
function humanize(entityType: string): string {
  const words = entityType.split(/[_-]+/).filter(Boolean);
  if (words.length === 0) return "Entity";
  return words.map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(" ");
}

/**
 * Read a draft out of a page's query. Null when the query carries nothing to
 * pre-fill — the form then opens blank, exactly as it always did.
 *
 * Two shapes are understood:
 *   - OrangeCat's button: `from=orangecat&entity_type&entity_id&source&title`.
 *     `source` is the entity's path on OrangeCat and must be a bare path;
 *     anything else (a host, a scheme) is dropped rather than linked, because
 *     the line "pre-filled from OrangeCat" must never point off OrangeCat.
 *   - A plain pre-fill: any of `title`, `body`, `category`. This is what a
 *     ratification link or a Loki page uses.
 */
export function draftFromQuery(q: Query): ProposalDraft | null {
  const from = one(q.from);
  const requested = one(q.category);
  const category = isFileableCategory(requested) ? requested : DEFAULT_CATEGORY;

  if (from === "orangecat") {
    const entityType = one(q.entity_type).slice(0, 40) || "entity";
    const source = one(q.source);
    const origin: ProposalOrigin | null = isSafePath(source)
      ? { product: "orangecat", url: new URL(source, orangeCatOrigin()).toString(), entityType }
      : null;
    const title = (one(q.title).trim() || `${humanize(entityType)} on OrangeCat`).slice(
      0,
      TITLE_MAX,
    );
    const about = origin
      ? `${humanize(entityType)}: ${origin.url}`
      : `${humanize(entityType)} on OrangeCat`;
    const body = one(q.body).trim().slice(0, BODY_MAX) || `About ${about}\n\n`;
    return { category, title, body, origin };
  }

  const title = one(q.title).trim().slice(0, TITLE_MAX);
  const body = one(q.body).trim().slice(0, BODY_MAX);
  if (!title && !body && !isFileableCategory(requested)) return null;
  return { category, title, body, origin: null };
}

/**
 * The query, re-serialised so a redirect can carry it. Sign-in goes through
 * OrangeCat and comes back; join goes to /join and comes back; both must land
 * on the SAME pre-filled form, or the person retypes what they already had.
 */
export function rawQueryString(q: Query): string {
  return new URLSearchParams(
    Object.entries(q).flatMap(([k, v]) =>
      v === undefined ? [] : (Array.isArray(v) ? v : [v]).map((x) => [k, x] as [string, string]),
    ),
  ).toString();
}

/** A link to the form with these fields already in it. */
export function proposeHref(draft: Pick<ProposalDraft, "category" | "title" | "body">): string {
  const params = new URLSearchParams();
  params.set("category", draft.category);
  if (draft.title) params.set("title", draft.title.slice(0, TITLE_MAX));
  if (draft.body) params.set("body", draft.body.slice(0, BODY_MAX));
  return `/propose?${params.toString()}`;
}
