import { getTranslations, setRequestLocale } from "next-intl/server";
import { toLocale } from "@/i18n/routing";
import PlaceHero from "@/components/places/place-hero";
import ProfileFrame from "@/components/places/profile-frame";
import ShareButton from "@/components/places/share-button";
import { placesConfig } from "@/lib/config/places";
import { regionHref } from "@/lib/places/place-href";
import { WORLD, regionName } from "@/lib/config/world";
import { db } from "@/lib/db/client";
import { loadGlobePlaces } from "@/lib/law/globe";
import { PLACE_KINDS, kindOf, type PlaceKind } from "@/lib/config/world/kinds";
import { placePhoto } from "@/lib/places/place-photo";
import PlaceTile from "@/components/places/place-tile";

export const dynamic = "force-dynamic";

/** The kinds the page's headline counts; the rest are in their own sections below. */
const HEADLINE_KINDS: readonly PlaceKind[] = ["state", "self_governing", "territory", "proclaimed"];

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
  // Each country's own law: the figure its page prints (`counts.ts`), not the total with its communes.
  const acts = new Map(globe.flatMap((p) => (p.region ? [[p.region, p.own] as const] : [])));
  const rows = WORLD.map((region) => {
    const pack = region.code ? placesConfig.packs.find((p) => p.region === region.code) : undefined;
    return {
      slug: region.slug,
      href: regionHref(region, pack?.key),
      name: regionName(region, locale),
      acts: region.code ? (acts.get(region.code) ?? 0) : 0,
      places: Boolean(pack),
      kind: kindOf(region),
      photo: placePhoto([`world:${region.slug}`]),
    };
  }).sort((a, b) => a.name.localeCompare(b.name, locale));
  // By what each place does, the UN's members first; A to Z within each.
  const groups = PLACE_KINDS.map((kind) => ({
    kind,
    rows: rows.filter((r) => r.kind === kind),
  })).filter((g) => g.rows.length > 0);

  return (
    <ProfileFrame
      wide
      hero={
        <PlaceHero
          photo={placePhoto(["wikidata:Q2"])}
          trail={null}
          share={<ShareButton title={t("world.title")} />}
          kicker={t("index.title")}
          title={t("world.title")}
          line={t("world.indexIntro")}
          facts={groups
            .filter((g) => HEADLINE_KINDS.includes(g.kind))
            .map((g) => ({ label: t(`world.groups.${g.kind}`), value: String(g.rows.length) }))}
          credit={t("photoCredit", {
            author: placePhoto(["wikidata:Q2"])?.author ?? "",
            license: placePhoto(["wikidata:Q2"])?.license ?? "",
          })}
        />
      }
    >
      <>
        {groups.map((group) => (
          <section key={group.kind} aria-labelledby={`kind-${group.kind}`} className="space-y-4">
            <h2 id={`kind-${group.kind}`} className="headline text-2xl text-fg-primary">
              {t(`world.groups.${group.kind}`)}{" "}
              <span className="text-fg-tertiary">{group.rows.length}</span>
            </h2>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {group.rows.map((row) => (
                <li key={row.slug} className="min-w-0">
                  <PlaceTile
                    href={row.href}
                    photo={row.photo}
                    name={row.name}
                    note={
                      row.places
                        ? t("world.heldPlaces", { count: row.acts })
                        : row.acts > 0
                          ? t("law.count", { count: row.acts })
                          : ""
                    }
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </>
    </ProfileFrame>
  );
}
