/**
 * Where a law applies, as a tree: a union of countries, a country, its cantons,
 * their communes (design: docs/design/2026-11-law-navigation.md). The tree is
 * derived from `LAW_AUTHORITIES` (`place`, `within` and `members`), never typed here, so a new country,
 * a territory nobody recognises or an organisation's bylaws is a row of
 * configuration and the pages, the sitemap and the tools follow.
 */
import { sql } from "drizzle-orm";
import { LAW_AUTHORITIES, countryOf, type LawAuthority } from "@/lib/config/law";
import type { Database } from "@/lib/db/client";
import type { ActSearchHit, AuthorityCoverage } from "./register/coverage";

export type PlaceLevel = "union" | "country" | "region" | "commune" | "shared";

export const authorityOf = (key: string): LawAuthority | undefined =>
  LAW_AUTHORITIES.find((a) => a.key === key);

/** The authority that speaks for a whole country (its `iso_3166_1` place). */
export const countryAuthority = (country: string): LawAuthority | undefined =>
  LAW_AUTHORITIES.find((a) => a.place?.scheme === "iso_3166_1" && a.place.value === country);

/** The union of countries a country belongs to, whose law applies there above its own: the European Union above Estonia. */
export const unionOf = (country: string): LawAuthority | undefined =>
  LAW_AUTHORITIES.find((a) => a.members?.includes(country));

/** What kind of place an authority speaks for. */
export function levelOf(authority: LawAuthority): PlaceLevel {
  if (authority.members) return "union";
  if (authority.within) return "commune";
  if (authority.place?.scheme === "iso_3166_1") return "country";
  return authority.place === null ? "shared" : "region";
}

/**
 * The authority above this one: a commune's canton or country, a canton's country, a
 * country's union (the European Union above Luxembourg). A union, and a country in none, is a root.
 */
export function parentOf(key: string): LawAuthority | null {
  const authority = authorityOf(key);
  if (!authority) return null;
  if (authority.within) return authorityOf(authority.within) ?? null;
  const level = levelOf(authority);
  if (level === "union") return null;
  if (level === "country") return unionOf(authority.place!.value) ?? null;
  const country = countryOf(key);
  return (country && countryAuthority(country)) || null;
}

/** This authority and every one above it: the laws that apply where it does, nearest first. */
export function chainOf(key: string): LawAuthority[] {
  const chain: LawAuthority[] = [];
  const seen = new Set<string>();
  let current = authorityOf(key) ?? null;
  while (current && !seen.has(current.key)) {
    seen.add(current.key);
    chain.push(current);
    current = parentOf(current.key);
  }
  return chain;
}

export interface PlaceNode {
  key: string;
  name: string;
  level: PlaceLevel;
  inForce: number;
  withText: number;
  children: PlaceNode[];
}

/** The tree of places that hold at least one act, or whose descendants do. */
export function placeTree(counts: readonly AuthorityCoverage[]): PlaceNode[] {
  const node = (authority: LawAuthority): PlaceNode => {
    const c = counts.find((x) => x.key === authority.key);
    return {
      key: authority.key,
      name: authority.label,
      level: levelOf(authority),
      inForce: c?.inForce ?? 0,
      withText: c?.withText ?? 0,
      children: [],
    };
  };
  const nodes = new Map(LAW_AUTHORITIES.map((a) => [a.key, node(a)]));
  const roots: PlaceNode[] = [];
  for (const authority of LAW_AUTHORITIES) {
    const self = nodes.get(authority.key)!;
    const parent = parentOf(authority.key);
    if (parent) nodes.get(parent.key)!.children.push(self);
    else roots.push(self);
  }
  const sorted = (list: PlaceNode[]): PlaceNode[] =>
    list
      .map((n) => ({ ...n, children: sorted(n.children) }))
      .filter((n) => n.inForce > 0 || n.children.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  return sorted(roots);
}

export const PLACE_ACTS_PER_PAGE = 50;

export interface PlaceActs {
  total: number;
  acts: ActSearchHit[];
}

/** One page of a place's acts in force, in the order their collection numbers them. */
export async function listPlaceActs(
  db: Database,
  input: { authority: string; title?: string; page: number },
): Promise<PlaceActs> {
  const title = input.title?.trim().slice(0, 100) || null;
  const pattern = title ? `%${title.replace(/[\\%_]/g, "\\$&")}%` : null;
  const offset = Math.max(0, input.page - 1) * PLACE_ACTS_PER_PAGE;
  const rows = await db.execute(sql`
    SELECT a.id, a.authority, a.kind, a.in_force AS "inForce",
           n.text AS title, num.value AS "systematicNumber", ou.value AS "officialUrl",
           count(*) OVER ()::int AS total
    FROM legal_acts a
    LEFT JOIN legal_act_names n
      ON n.act_id = a.id AND n.kind = 'title' AND n.superseded_at IS NULL
    LEFT JOIN legal_act_identifiers num
      ON num.act_id = a.id AND num.scheme = 'systematic_number' AND num.superseded_at IS NULL
    LEFT JOIN legal_act_identifiers ou
      ON ou.act_id = a.id AND ou.scheme = 'official_url' AND ou.superseded_at IS NULL
    WHERE a.authority = ${input.authority} AND a.in_force
      AND (${pattern}::text IS NULL OR n.text ILIKE ${pattern})
    ORDER BY ARRAY(
               SELECT CASE WHEN part ~ '^[0-9]{1,9}$' THEN part::int ELSE 0 END
               FROM unnest(string_to_array(num.value, '.')) AS part
             ) NULLS LAST, n.text
    LIMIT ${PLACE_ACTS_PER_PAGE} OFFSET ${offset}
  `);
  const list = rows.rows as unknown as (ActSearchHit & { total: number })[];
  return {
    total: list[0]?.total ?? 0,
    acts: list.map(({ total: _total, ...act }) => ({ ...act, lexfindId: null })),
  };
}
