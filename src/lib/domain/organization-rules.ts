/**
 * The founding rules that are pure — no database, no HTTP — so the founding
 * form can check a slug as it is typed and the API enforces the identical rule.
 *
 * Kept apart from organization.ts for the reason enums.ts is kept apart from
 * the schema: that module imports the database client, and importing it from
 * a client component would pull a Postgres driver into the founder's browser.
 */

/**
 * Slugs that would shadow a route or read as the platform itself. `new` is the
 * one that would break something (/orgs/new); the rest are here so nobody can
 * found an organization whose address looks like one of Solon's own pages.
 */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  "new",
  "api",
  "admin",
  "orgs",
  "join",
  "propose",
  "proposals",
  "account",
  "dashboard",
  "governance",
  "treasury",
  "solon",
]);

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;

/** Why a slug is unusable, or null. */
export function slugProblem(slug: string): string | null {
  if (!SLUG_PATTERN.test(slug)) {
    return "use 3–40 lowercase letters, digits or hyphens, starting and ending with a letter or digit";
  }
  if (slug.includes("--")) return "use single hyphens only";
  if (RESERVED_SLUGS.has(slug)) return `"${slug}" is reserved`;
  return null;
}

/**
 * The name is inside the signed message, one field per line, so a line break
 * in it could forge a line the founder never meant to sign.
 */
export function nameProblem(name: string): string | null {
  if (/[\r\n]/.test(name)) return "a name cannot contain a line break";
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 80) return "use a name of 2–80 characters";
  return null;
}

export function descriptionProblem(description: string | null | undefined): string | null {
  if (description && description.length > 500) return "keep the description under 500 characters";
  return null;
}

import {
  COLLECTIVE_KINDS,
  isCollectiveKindId,
  legalProblem,
  placeProblem,
  type CollectiveKindId,
  type LegalRecord,
  type Place,
} from "@/lib/collective-kinds";

export interface BodyFacts {
  kind?: string | null;
  place?: Partial<Place> | null;
  legal?: Partial<LegalRecord> | null;
}

const PLACE_WORDS: Record<string, string> = {
  country_code: "the country, as a two-letter code (CH)",
  region: "the region — canton, state or province",
  locality: "the locality — village, quarter or town",
};

/**
 * What is wrong with what the founder said the body IS, or null. One sentence,
 * about one field, in the order the form shows them — the same reading the API
 * refuses on, so the form can never accept what the API will not.
 */
export function bodyProblem(facts: BodyFacts): string | null {
  if (facts.kind != null && !isCollectiveKindId(facts.kind))
    return "choose one of the kinds of body";
  const kind: CollectiveKindId | undefined = isCollectiveKindId(facts.kind)
    ? facts.kind
    : undefined;
  const anyPlace = Boolean(
    facts.place?.country_code || facts.place?.region || facts.place?.locality,
  );
  if ((kind && COLLECTIVE_KINDS[kind].needsPlace) || anyPlace) {
    const missing = placeProblem(facts.place);
    if (missing) {
      const head =
        kind && COLLECTIVE_KINDS[kind].needsPlace
          ? `a ${COLLECTIVE_KINDS[kind].name.toLowerCase()} belongs to a place — `
          : "";
      return `${head}give ${PLACE_WORDS[missing]}`;
    }
  }
  const status = facts.legal?.status;
  if (status && status !== "informal") {
    const problem = legalProblem(
      { ...facts.legal, status },
      kind ? COLLECTIVE_KINDS[kind] : undefined,
    );
    if (problem === "kind_cannot_be_tax_exempt") {
      return `a ${kind ? COLLECTIVE_KINDS[kind].name.toLowerCase() : "body"} of this kind cannot be recognised as tax-exempt`;
    }
    if (problem) return `a ${status.replace("_", "-")} body needs its ${problem.replace("_", " ")}`;
  }
  return null;
}
