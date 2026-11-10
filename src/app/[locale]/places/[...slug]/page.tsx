import { cache } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import PlaceProfile from "@/components/places/place-profile";
import WorldRegionPage from "@/components/places/world-region-page";
import { placesConfig } from "@/lib/config/places";
import { regionName, worldRegion, worldRegionByCode } from "@/lib/config/world";
import { db } from "@/lib/db/client";
import { countryLawKey, loadCountryLaw, loadPlaceLaw } from "@/lib/law/place-law";
import { loadPlacePage } from "@/lib/places/place-page";
import { WORLD_PACK } from "@/lib/config/places/countries/world";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string; slug: string[] }>;

const today = () => new Date().toISOString().slice(0, 10);

const load = cache((slugPath: string, locale: string) =>
  loadPlacePage(db, placesConfig, slugPath, today(), locale),
);

const slugPathOf = (slug: string[]) => slug.map(decodeURIComponent).join("/");

/** A country or territory Solon holds no places for, by its one-segment path. */
const regionOf = (slug: string[]) =>
  slug.length === 1 ? worldRegion(slugPathOf(slug)) : undefined;

export async function generateMetadata({ params }: { params: Params }) {
  const { locale: raw, slug } = await params;
  const locale = toLocale(raw);
  const t = await getTranslations({ locale, namespace: "Places" });
  const view = await load(slugPathOf(slug), locale);
  if (view) {
    const values = { name: view.name, level: view.levelName, pack: view.packName };
    return { title: t("metaTitle", values), description: t("metaDescription", values) };
  }
  const region = regionOf(slug);
  if (!region) return {};
  const name = regionName(region, locale);
  return { title: name, description: t("world.metaDescription", { place: name }) };
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
    const law = await loadPlaceLaw(db, view.lawAuthorities ?? []);
    const key = countryLawKey(view.region);
    const taxHref = key ? `/places/tax?in=${key}` : "/places/tax";
    return <PlaceProfile view={view} law={law} taxHref={taxHref} t={t} />;
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
  const claimant = region.claimedBy ? worldRegionByCode(region.claimedBy) : undefined;
  const claimantPack = claimant?.code
    ? placesConfig.packs.find((p) => p.region === claimant.code)
    : undefined;
  return (
    <WorldRegionPage
      name={regionName(region, locale)}
      claimedBy={
        claimant
          ? {
              name: regionName(claimant, locale),
              href: `/places/${claimantPack?.key ?? claimant.slug}`,
            }
          : null
      }
      law={region.code ? await loadCountryLaw(db, region.code) : []}
      t={t}
    />
  );
}
