import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import PageLayout from "@/components/ui/page-layout";
import { placesConfig } from "@/lib/config/places";
import { WORLD, regionName } from "@/lib/config/world";
import { db } from "@/lib/db/client";
import { loadGlobePlaces } from "@/lib/law/globe";
import { kindOf } from "@/lib/config/world/kinds";
import { placePhoto } from "@/lib/places/place-photo";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Places" });
  return { title: t("world.title"), description: t("world.indexIntro") };
}

/**
 * Every country, territory and jurisdiction, A to Z in the reader's language,
 * each a tile with its photograph opening its own page. One tile shape for
 * all: the photograph (or a plain tile where Solon has none), the name, its
 * kind and what Solon holds there.
 */
export default async function WorldPage({ params }: { params: Params }) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Places" });
  const globe = await loadGlobePlaces(db);
  const acts = new Map(globe.flatMap((p) => (p.region ? [[p.region, p.acts] as const] : [])));
  const rows = WORLD.map((region) => {
    const pack = region.code ? placesConfig.packs.find((p) => p.region === region.code) : undefined;
    return {
      slug: pack?.key ?? region.slug,
      name: regionName(region, locale),
      acts: region.code ? (acts.get(region.code) ?? 0) : 0,
      places: Boolean(pack),
      kind: kindOf(region),
      photo: placePhoto([`world:${region.slug}`]),
    };
  }).sort((a, b) => a.name.localeCompare(b.name, locale));

  // The small photograph a tile needs: a width Wikimedia keeps.
  const small = (src: string) => src.replace(/\/\d+px-/, "/500px-");
  return (
    <PageLayout title={t("world.title")} kicker={t("index.title")}>
      <div className="space-y-6">
        <p className="max-w-3xl text-fg-secondary">{t("world.indexIntro")}</p>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {rows.map((row) => (
            <li key={row.slug} className="min-w-0">
              <Link
                href={`/places/${row.slug}`}
                className="dark group relative flex aspect-[4/3] items-end overflow-hidden rounded-surface border border-default bg-surface-raised"
              >
                {row.photo && (
                  <Image
                    src={small(row.photo.src)}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    style={{ objectPosition: row.photo.position ?? "center 40%" }}
                  />
                )}
                <div className="scrim absolute inset-0" aria-hidden="true" />
                <div className="relative w-full p-3 sm:p-4">
                  <span className="block truncate text-xs uppercase tracking-wider text-fg-tertiary">
                    {t(`profile.kicker.${row.kind}`)}
                  </span>
                  <span className="block font-semibold text-fg-primary [overflow-wrap:anywhere]">
                    {row.name}
                  </span>
                  <span className="block min-h-5 text-xs text-fg-secondary">
                    {row.places
                      ? t("world.heldPlaces", { count: row.acts })
                      : row.acts > 0
                        ? t("law.count", { count: row.acts })
                        : ""}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </PageLayout>
  );
}
