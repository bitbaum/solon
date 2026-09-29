import type { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import PageLayout from "@/components/ui/page-layout";
import type { PlaceLink, PlaceView } from "@/lib/places/place-view";

export type PlacesTranslator = ReturnType<typeof useTranslations<"Places">>;

interface PlaceProfileProps {
  view: PlaceView;
  t: PlacesTranslator;
}

const placeHref = (slugPath: string) => `/places/${slugPath}`;

function PlaceName({ place }: { place: PlaceLink }) {
  return place.slugPath ? (
    <Link href={placeHref(place.slugPath)} className="text-fg-primary hover:underline">
      {place.name}
    </Link>
  ) : (
    <span className="text-fg-primary">{place.name}</span>
  );
}

/**
 * One place, as the record has it (design §9): where it sits, whether it
 * levies tax, what else it is called, and the source behind every line. Every
 * word of structure comes from the pack; nothing here knows a country.
 */
export default function PlaceProfile({ view, t }: PlaceProfileProps) {
  const row = (label: string, value: React.ReactNode, key = label) => (
    <div key={key} className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-6">
      <dt className="text-fg-secondary">{label}</dt>
      <dd className="text-fg-primary sm:text-right">{value}</dd>
    </div>
  );

  return (
    <PageLayout
      title={view.name}
      kicker={t("kicker", { level: view.levelName, pack: view.packName })}
    >
      <div className="mx-auto max-w-3xl space-y-10">
        <p className="flex flex-wrap items-center gap-3 text-sm text-fg-secondary">
          <span className="rounded-pill border border-default px-3 py-1 text-fg-primary">
            {t("official")}
          </span>
          {t("officialNote")}
        </p>

        {view.partOf.length > 0 && (
          <nav aria-label={t("partOf")}>
            <h2 className="mb-3 font-semibold text-fg-primary">{t("partOf")}</h2>
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              {view.partOf.map((place, i) => (
                <li key={`${place.slugPath}-${i}`} className="flex items-center gap-2">
                  {i > 0 && <span className="text-fg-tertiary">›</span>}
                  <PlaceName place={place} />
                  <span className="text-fg-tertiary">({place.levelName})</span>
                </li>
              ))}
            </ol>
          </nav>
        )}

        {view.alsoServedBy.length > 0 && (
          <section>
            <h2 className="mb-3 font-semibold text-fg-primary">{t("alsoServedBy")}</h2>
            <ul className="space-y-1 text-sm">
              {view.alsoServedBy.map((place, i) => (
                <li key={`${place.slugPath}-${i}`}>
                  <PlaceName place={place} />{" "}
                  <span className="text-fg-tertiary">({place.levelName})</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-surface border border-default bg-surface-base p-6">
          <h2 className="mb-2 font-semibold text-fg-primary">{t("tax.title")}</h2>
          <p className="text-sm text-fg-secondary">
            {view.takesTax === null
              ? t("tax.noModel", { pack: view.packName })
              : view.takesTax
                ? t("tax.levies", { pack: view.packName })
                : t("tax.none")}
          </p>
        </section>

        {(view.otherNames.length > 0 || view.identifiers.length > 0) && (
          <dl className="space-y-2 rounded-surface border border-default bg-surface-base p-6 text-sm">
            {view.otherNames.length > 0 &&
              row(
                t("otherNames"),
                view.otherNames.map((n) => (
                  <span key={`${n.locale}-${n.name}`} className="block" lang={n.locale}>
                    {n.name} <span className="text-fg-tertiary">({n.locale})</span>
                  </span>
                )),
              )}
            {view.identifiers.map((id) =>
              row(
                id.label,
                id.url ? (
                  <a href={id.url} className="font-mono hover:underline" rel="noopener noreferrer">
                    {id.value}
                  </a>
                ) : (
                  <span className="font-mono">{id.value}</span>
                ),
                `${id.label}-${id.value}`,
              ),
            )}
          </dl>
        )}

        {view.sources.length > 0 && (
          <section>
            <h2 className="mb-3 font-semibold text-fg-primary">{t("sources.title")}</h2>
            <ul className="space-y-3 text-sm">
              {view.sources.map((source) => (
                <li key={`${source.publisher}-${source.dataset}`} className="text-fg-secondary">
                  <a
                    href={source.homepage}
                    className="text-fg-primary hover:underline"
                    rel="noopener noreferrer"
                  >
                    {source.publisher}: {source.dataset}
                  </a>
                  <span className="block text-xs">
                    {t("sources.retrieved", { date: source.retrievedAt })} ·{" "}
                    {t("sources.licence", { licence: source.licence })}
                    {source.attribution && ` · ${source.attribution}`}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </PageLayout>
  );
}
