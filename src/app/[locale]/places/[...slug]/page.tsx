import { cache } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { toLocale, type Locale } from "@/i18n/routing";
import PlaceProfile from "@/components/places/place-profile";
import WorldRegionPage from "@/components/places/world-region-page";
import { placesConfig } from "@/lib/config/places";
import {
  regionName,
  worldEntryOfPack,
  worldRegion,
  worldRegionByCode,
  type WorldRegion,
} from "@/lib/config/world";
import { loadWorldProfile, type WorldProfileView } from "@/lib/places/world-profile";
import { placePhoto } from "@/lib/places/place-photo";
import PlaceHero from "@/components/places/place-hero";
import { profileStatus } from "@/components/places/country-profile";
import type { PlacesTranslator } from "@/components/places/translator";
import type { BudgetLink } from "@/components/budgets/budget-link-card";
import { holderOfRegion } from "@/lib/budgets/holders";
import { holdsBudget } from "@/lib/budgets/read";
import { db } from "@/lib/db/client";
import { countryLawKey, loadCountryLaw, loadPlaceLaw } from "@/lib/law/place-law";
import { LAW_AUTHORITIES } from "@/lib/config/law";
import { contestNote, contestSlugForPack } from "@/lib/places/contest-view";
import { loadPlacePage } from "@/lib/places/place-page";
import { WORLD_PACK } from "@/lib/config/places/countries/world";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string; slug: string[] }>;

const today = () => new Date().toISOString().slice(0, 10);

const load = cache((slugPath: string, locale: string) =>
  loadPlacePage(db, placesConfig, slugPath, today(), locale),
);

const slugPathOf = (slug: string[]) => slug.map(decodeURIComponent).join("/");

/** The way into a country's public budget, when Solon holds one for it. */
async function budgetLink(
  region: WorldRegion | undefined,
  locale: Locale,
): Promise<BudgetLink | null> {
  const holder = region ? holderOfRegion(region) : null;
  if (!region || !holder || !(await holdsBudget(db, holder))) return null;
  const t = await getTranslations({ locale, namespace: "Budgets" });
  const place = regionName(region, locale);
  return {
    title: t("placeCard.title"),
    text: t("placeCard.text", { place }),
    open: t("placeCard.open"),
    href: `/budgets/${region.slug}`,
  };
}

/** A country's, territory's or proclaimed state's profile, by its world entry. */
const profileOf = (region: WorldRegion | undefined, locale: Locale) =>
  region
    ? loadWorldProfile(db, region, locale, worldRegionByCode, (r) => regionName(r, locale))
    : Promise.resolve(null);

/**
 * The top of a place's page when Solon holds a photograph of it: its kind, its name, the
 * sentence that says what it is, and a country's capital, population and area.
 */
function heroOf(
  keys: readonly string[],
  title: string,
  kicker: string,
  line: string | null,
  profile: WorldProfileView | null,
  t: PlacesTranslator,
) {
  const photo = placePhoto(keys);
  if (!photo) return null;
  const facts = (profile?.facts ?? [])
    // Capital, population and area; a population of none (Liberland's) is left to the card below.
    .filter((f) => f.key === "capital" || f.key === "population" || f.key === "area")
    .filter((f) => !(f.key === "population" && /^0(\s|$)/.test(f.value)))
    .map((f) => ({ label: t(`profile.facts.${f.key}`), value: f.value }));
  return (
    <PlaceHero
      photo={photo}
      kicker={kicker}
      title={title}
      line={line}
      facts={facts}
      credit={t("photoCredit", { author: photo.author, license: photo.license })}
    />
  );
}

/** A country or territory Solon holds no places for, by its one-segment path. */
const regionOf = (slug: string[]) =>
  slug.length === 1 ? worldRegion(slugPathOf(slug)) : undefined;

export async function generateMetadata({ params }: { params: Params }) {
  const { locale: raw, slug } = await params;
  const locale = toLocale(raw);
  const t = await getTranslations({ locale, namespace: "Places" });
  // The card a shared link shows: the place's photograph and name (src/app/api/og/place).
  const card = {
    images: [
      {
        url: `/api/og/place?locale=${locale}&path=${encodeURIComponent(slugPathOf(slug))}`,
        width: 1200,
        height: 630,
      },
    ],
  };
  const view = await load(slugPathOf(slug), locale);
  if (view) {
    const values = { name: view.name, level: view.levelName, pack: view.packName };
    const title = t("metaTitle", values);
    const description = t("metaDescription", values);
    return {
      title,
      description,
      openGraph: { title, description, ...card },
      twitter: { card: "summary_large_image", ...card },
    };
  }
  const region = regionOf(slug);
  if (!region) return {};
  const name = regionName(region, locale);
  const description = t("world.metaDescription", { place: name });
  return {
    title: name,
    description,
    openGraph: { title: name, description, ...card },
    twitter: { card: "summary_large_image", ...card },
  };
}

/**
 * One place, by its path: /places/<pack>/<segment>/… (design §4.1, §9), at
 * any level. A country or territory Solon holds no places for has a page at
 * /places/<its slug> all the same; one whose places Solon holds is sent to
 * its pack's path, and one the world pack holds to /places/world/<its slug>.
 */
export default async function PlacePage({ params }: { params: Params }) {
  const { locale: raw, slug } = await params;
  const locale = toLocale(raw);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Places" });
  const view = await load(slugPathOf(slug), locale);
  if (view) {
    const law = await loadPlaceLaw(db, view.lawAuthorities ?? [], locale);
    const key = countryLawKey(view.region);
    const taxHref = key ? `/places/tax?in=${key}` : "/places/tax";
    const pack = placesConfig.packs.find((p) => p.key === view.packKey);
    const contest = contestNote(pack ? contestSlugForPack(pack) : null, locale);
    // A country's budget is shown on the country's own page: a world nation, or a pack's root.
    const country =
      view.packKey === WORLD_PACK
        ? worldRegion(view.slugPath.split("/").at(-1) ?? "")
        : pack && view.partOf.length === 0
          ? worldEntryOfPack(pack)
          : undefined;
    const budget = await budgetLink(country, locale);
    const profile = await profileOf(country, locale);
    const above = [...view.partOf].reverse();
    const hero = heroOf(
      [...(country ? [`world:${country.slug}`] : []), ...view.refs],
      view.name,
      profile ? t(`profile.kicker.${profile.kind}`) : view.levelName,
      profile
        ? profileStatus(profile, t)
        : above.length > 0
          ? t("summaryIn", { level: view.levelName, place: above.map((p) => p.name).join(", ") })
          : null,
      profile,
      t,
    );
    return (
      <PlaceProfile
        view={view}
        law={law}
        taxHref={taxHref}
        contest={contest}
        budget={budget}
        profile={profile}
        hero={hero}
        t={t}
      />
    );
  }

  const region = regionOf(slug);
  if (!region) notFound();
  const pack = region.code ? placesConfig.packs.find((p) => p.region === region.code) : undefined;
  if (pack && pack.key !== region.slug) {
    redirect({ href: `/places/${pack.key}`, locale });
  }
  // A country no pack holds in depth is a place of the world pack, under the
  // same slug; its page there carries its figures. A place another state
  // claims keeps this page, which says so.
  if (!pack && !region.claimedBy && (await load(`${WORLD_PACK}/${region.slug}`, locale))) {
    redirect({ href: `/places/${WORLD_PACK}/${region.slug}`, locale });
  }
  const profile = await profileOf(region, locale);
  const name = regionName(region, locale);
  return (
    <WorldRegionPage
      name={name}
      contest={contestNote(region.slug, locale)}
      budget={await budgetLink(region, locale)}
      law={
        region.code
          ? await loadCountryLaw(db, region.code, locale)
          : // A place beyond the ISO list that makes law (Liberland) has an authority by its slug.
            LAW_AUTHORITIES.some((a) => a.key === region.slug)
            ? await loadPlaceLaw(db, [region.slug], locale)
            : []
      }
      profile={profile}
      hero={heroOf(
        [`world:${region.slug}`],
        name,
        profile ? t(`profile.kicker.${profile.kind}`) : t("world.kicker"),
        profile ? profileStatus(profile, t) : null,
        profile,
        t,
      )}
      t={t}
    />
  );
}
