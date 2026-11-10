/**
 * What a reader calls a law authority: its place's own name, read from
 * Places in the reader's language. The law config keeps an English `label`
 * for logs, the API and prompts; pages never show it while Places can answer.
 *
 * An authority with no single place (the cantons together, the European
 * Union) is named from messages (`Law.authority.<key>`). Two authorities whose
 * places share a name (the canton and the city of Zürich) are told apart by
 * their level, in the reader's language.
 */
import { cache } from "react";
import { and, inArray, isNull } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { toLocale } from "@/i18n/routing";
import { LAW_AUTHORITIES, type LawAuthority } from "@/lib/config/law";
import { placesConfig } from "@/lib/config/places";
import { db } from "@/lib/db/client";
import { jurisdictionIdentifiers, jurisdictionNames, jurisdictions } from "@/lib/db/places-schema";
import type { ChainName } from "@/lib/places/chain";
import { displayName, localized } from "@/lib/places/place-view";

export type AuthorityNames = ReadonlyMap<string, string>;

interface PlaceOfAuthority {
  names: ChainName[];
  countryPack: string | null;
  levelKey: string | null;
}

/** Pure: the names, given each authority's place as Places holds it. */
export function nameAuthorities(
  authorities: readonly LawAuthority[],
  placeOf: (authority: LawAuthority) => PlaceOfAuthority | undefined,
  locale: string,
  unplaced: (key: string) => string | undefined,
): AuthorityNames {
  const region = new Intl.DisplayNames([locale], { type: "region", fallback: "none" });
  const named = authorities.map((authority) => {
    const place = placeOf(authority);
    const pack = place ? placesConfig.packs.find((p) => p.key === place.countryPack) : undefined;
    const own = place && pack ? displayName(place.names, locale, pack.defaultLocales) : "";
    const country =
      authority.place?.scheme === "iso_3166_1" ? region.of(authority.place.value) : undefined;
    const name =
      own ||
      country ||
      authority.names?.[locale] ||
      (authority.place ? undefined : unplaced(authority.key)) ||
      authority.label;
    const level = pack?.levels.find((l) => l.key === place?.levelKey);
    return { key: authority.key, name, level: level ? localized(level.names, locale) : null };
  });
  const count = new Map<string, number>();
  for (const { name } of named) count.set(name, (count.get(name) ?? 0) + 1);
  return new Map(
    named.map(({ key, name, level }) => [
      key,
      (count.get(name) ?? 0) > 1 && level ? `${name} (${level})` : name,
    ]),
  );
}

/** Every authority's name for this reader; read once per request. */
export const loadAuthorityNames = cache(async (locale: string): Promise<AuthorityNames> => {
  const placed = LAW_AUTHORITIES.flatMap((a) => (a.place ? [a.place] : []));
  const ids = await db
    .select({
      jurisdictionId: jurisdictionIdentifiers.jurisdictionId,
      scheme: jurisdictionIdentifiers.scheme,
      value: jurisdictionIdentifiers.value,
    })
    .from(jurisdictionIdentifiers)
    .where(
      and(
        inArray(jurisdictionIdentifiers.scheme, [...new Set(placed.map((p) => p.scheme))]),
        inArray(jurisdictionIdentifiers.value, [...new Set(placed.map((p) => p.value))]),
        isNull(jurisdictionIdentifiers.supersededAt),
      ),
    );
  const idOf = new Map(ids.map((r) => [`${r.scheme}:${r.value}`, r.jurisdictionId]));
  const wanted = [...new Set(ids.map((r) => r.jurisdictionId))];
  const [places, names] = wanted.length
    ? await Promise.all([
        db
          .select({
            id: jurisdictions.id,
            countryPack: jurisdictions.countryPack,
            levelKey: jurisdictions.levelKey,
          })
          .from(jurisdictions)
          .where(inArray(jurisdictions.id, wanted)),
        db
          .select({
            jurisdictionId: jurisdictionNames.jurisdictionId,
            locale: jurisdictionNames.locale,
            script: jurisdictionNames.script,
            name: jurisdictionNames.name,
            nameType: jurisdictionNames.nameType,
          })
          .from(jurisdictionNames)
          .where(
            and(
              inArray(jurisdictionNames.jurisdictionId, wanted),
              isNull(jurisdictionNames.supersededAt),
              isNull(jurisdictionNames.validTo),
            ),
          ),
      ])
    : [[], []];
  const t = await getTranslations({ locale: toLocale(locale), namespace: "Law.authority" });
  // The authorities no single place stands for, named in the reader's language.
  const unplaced: Record<string, string> = { intercantonal: t("intercantonal"), eu: t("eu") };
  return nameAuthorities(
    LAW_AUTHORITIES,
    (authority) => {
      const id = authority.place && idOf.get(`${authority.place.scheme}:${authority.place.value}`);
      const place = id ? places.find((p) => p.id === id) : undefined;
      if (!place) return undefined;
      return {
        countryPack: place.countryPack,
        levelKey: place.levelKey,
        names: names.filter((n) => n.jurisdictionId === id).map(({ jurisdictionId: _, ...n }) => n),
      };
    },
    locale,
    (key) => unplaced[key],
  );
});

/** An authority's name from a loaded set, else its English label, else its key. */
export const authorityName = (names: AuthorityNames, key: string): string =>
  names.get(key) ?? LAW_AUTHORITIES.find((a) => a.key === key)?.label ?? key;

/** The names for the reader of the page being rendered (server components). */
export async function readerAuthorityNames(): Promise<AuthorityNames> {
  const { getLocale } = await import("next-intl/server");
  return loadAuthorityNames(await getLocale());
}
