/**
 * A place by a code it carries (design: docs/design/2026-11-place-navigation.md,
 * "URLs"): `/places/by/iso_3166_2/US-WY` finds Wyoming without anyone guessing
 * its path. The scheme must be one the config knows and the value must match
 * its pattern in full, so a request that could never name a place is refused
 * before the database is asked.
 */
import { and, eq, isNull } from "drizzle-orm";
import type { PlacesConfig } from "@/lib/config/places/schema";
import type { Database } from "@/lib/db/client";
import { jurisdictionIdentifiers, jurisdictions } from "@/lib/db/places-schema";

export interface IdentifierRequest {
  scheme: string;
  value: string;
}

/** The request when its scheme is registered and its value fits the scheme; null otherwise. */
export function checkIdentifier(
  config: Pick<PlacesConfig, "identifierSchemes">,
  scheme: string,
  value: string,
): IdentifierRequest | null {
  const known = config.identifierSchemes.find((s) => s.key === scheme && !s.retired);
  if (!known || value.length === 0 || value.length > 100) {
    return null;
  }
  return new RegExp(`^(?:${known.pattern})$`).test(value) ? { scheme, value } : null;
}

export interface Holder {
  slugPath: string;
  validFrom: string | null;
  validTo: string | null;
}

/**
 * Of the places that carried a code, the one that carries it on `on`; failing
 * that, the one that carried it last (a merged commune's code still finds it).
 */
export function pickHolder(holders: readonly Holder[], on: string): Holder | null {
  const current = holders.filter(
    (h) => (h.validFrom === null || h.validFrom <= on) && (h.validTo === null || h.validTo > on),
  );
  if (current.length > 0) {
    return current[0]!;
  }
  const ended = [...holders].sort((a, b) =>
    (b.validTo ?? "9999").localeCompare(a.validTo ?? "9999"),
  );
  return ended[0] ?? null;
}

/** The path of the state place that holds this code, or null. */
export async function findPlaceByIdentifier(
  db: Database,
  request: IdentifierRequest,
  on: string,
): Promise<string | null> {
  const rows = await db
    .select({
      slugPath: jurisdictions.slugPath,
      validFrom: jurisdictionIdentifiers.validFrom,
      validTo: jurisdictionIdentifiers.validTo,
    })
    .from(jurisdictionIdentifiers)
    .innerJoin(jurisdictions, eq(jurisdictions.id, jurisdictionIdentifiers.jurisdictionId))
    .where(
      and(
        eq(jurisdictionIdentifiers.scheme, request.scheme),
        eq(jurisdictionIdentifiers.value, request.value),
        isNull(jurisdictionIdentifiers.supersededAt),
        eq(jurisdictions.origin, "state"),
      ),
    );
  const holders = rows.flatMap((r) => (r.slugPath ? [{ ...r, slugPath: r.slugPath }] : []));
  return pickHolder(holders, on)?.slugPath ?? null;
}
