import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import PageLayout from "@/components/ui/page-layout";
import { placesConfig } from "@/lib/config/places";
import { WORLD, regionName } from "@/lib/config/world";
import { db } from "@/lib/db/client";
import { loadGlobePlaces } from "@/lib/law/globe";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Places" });
  return { title: t("world.title"), description: t("world.indexIntro") };
}

/**
 * Every country and territory, A to Z in the reader's language, each opening
 * its own page. One list, one row shape: the name, and what Solon holds there.
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
    };
  }).sort((a, b) => a.name.localeCompare(b.name, locale));

  return (
    <PageLayout title={t("world.title")} kicker={t("index.title")}>
      <div className="max-w-3xl space-y-6">
        <p className="text-fg-secondary">{t("world.indexIntro")}</p>
        <ul className="divide-y divide-default rounded-surface border border-default bg-surface-base">
          {rows.map((row) => (
            <li key={row.slug}>
              <Link
                href={`/places/${row.slug}`}
                className="flex min-h-11 items-center justify-between gap-3 px-5 py-2 hover:bg-surface-raised"
              >
                <span className="text-fg-primary">{row.name}</span>
                <span className="text-sm text-fg-tertiary">
                  {row.places
                    ? t("world.heldPlaces", { count: row.acts })
                    : row.acts > 0
                      ? t("law.count", { count: row.acts })
                      : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </PageLayout>
  );
}
