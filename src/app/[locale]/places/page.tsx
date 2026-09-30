import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import PlacesIndex from "@/components/places/places-index";
import { placesConfig } from "@/lib/config/places";
import { db } from "@/lib/db/client";
import { mapPackKey } from "@/lib/places/map-data";
import { loadPackIndex, placesAtLevel, searchPlaces } from "@/lib/places/search";
import { localized } from "@/lib/places/place-view";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string }>;
type SearchParams = Promise<{ q?: string; pack?: string; level?: string }>;

const today = () => new Date().toISOString().slice(0, 10);

export async function generateMetadata({ params }: { params: Params }) {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Places" });
  return { title: t("index.metaTitle"), description: t("index.metaDescription") };
}

/** Find a place by name or postcode, or browse a pack's levels (design §9.2). */
export default async function PlacesPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const { q = "", pack: packKey, level: levelKey } = await searchParams;
  const on = today();
  const query = q.trim().slice(0, 100);

  const pack = placesConfig.packs.find((p) => p.key === packKey);
  const level = pack?.levels.find((l) => l.key === levelKey);
  const [search, browsed, packs, mapPack] = await Promise.all([
    query ? searchPlaces(db, placesConfig, query, on, locale) : null,
    pack && level ? placesAtLevel(db, placesConfig, pack.key, level.key, on, locale) : null,
    loadPackIndex(db, placesConfig, on, locale),
    mapPackKey(db, placesConfig, on),
  ]);
  const t = await getTranslations({ locale, namespace: "Places" });
  return (
    <PlacesIndex
      query={query}
      searchAction={getPathname({ href: "/places", locale })}
      search={search}
      browse={
        pack && level && browsed
          ? {
              pack: pack.key,
              level: level.key,
              levelName: localized(level.names, locale),
              places: browsed,
            }
          : null
      }
      packs={packs}
      mapPack={mapPack}
      t={t}
    />
  );
}
