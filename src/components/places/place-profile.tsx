import type { PlacesTranslator } from "./translator";

import { Link } from "@/i18n/navigation";
import ProfileFrame from "./profile-frame";
import { LawChat } from "@/components/law/law-chat";
import { compareHref } from "@/lib/places/compare-view";
import type { PlaceLaw } from "@/lib/law/place-law";
import type { PlaceLink, PlaceView } from "@/lib/places/place-view";
import ActionList from "./action-list";
import CalendarButton from "./calendar-button";
import BudgetLinkCard, { type BudgetLink } from "@/components/budgets/budget-link-card";
import ContestNote, { type ContestNoteProps } from "./contest-note";
import CountryProfile from "./country-profile";
import type { WorldProfileView } from "@/lib/places/world-profile";
import { PlaceLawCard, PlaceTrail } from "./place-head";
import SourceList from "./source-list";
import { WORLD_PACK } from "@/lib/config/places/countries/world";

interface PlaceProfileProps {
  view: PlaceView;
  /** The law that applies here, nearest first. */
  law: readonly PlaceLaw[];
  /** Where the tax map of this place's country opens. */
  taxHref: string;
  /** When the world list says another state claims the place's country: who, and its comparison. */
  contest?: ContestNoteProps | null;
  /** The way into the country's public budget, on a country's own page when Solon holds one. */
  budget?: BudgetLink | null;
  /** A country's profile, on the country's own page. */
  profile?: WorldProfileView | null;
  /** Its photograph and title, when it has one. */
  hero?: React.ReactNode | null;
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
 * One place, at any level — a country, a canton, a commune, a quarter — on a
 * page of its own that can be shared. Read top-down: where it sits, the law
 * that applies there, the places inside it, then tax (a summary; the
 * calculator is its own page), what a resident can do, and the record behind
 * it all, closed until asked for. Every word of structure comes from the pack;
 * nothing here knows a country.
 */
export default function PlaceProfile({
  view,
  law,
  taxHref,
  contest = null,
  budget = null,
  profile = null,
  hero = null,
  t,
}: PlaceProfileProps) {
  const above = [...view.partOf].reverse();
  const row = (label: string, value: React.ReactNode, key = label) => (
    <div key={key} className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-6">
      <dt className="text-fg-secondary">{label}</dt>
      <dd className="text-fg-primary sm:text-right">{value}</dd>
    </div>
  );

  return (
    <ProfileFrame
      hero={hero}
      title={view.name}
      kicker={view.levelName}
      description={
        above.length > 0
          ? t("summaryIn", { level: view.levelName, place: above.map((p) => p.name).join(", ") })
          : undefined
      }
    >
      <div className="max-w-3xl space-y-10">
        <PlaceTrail above={view.partOf} name={view.name} t={t} />

        {contest && <ContestNote {...contest} t={t} />}

        {profile && <CountryProfile profile={profile} t={t} statusShown={!!hero} />}

        <PlaceLawCard law={law} name={view.name} t={t} />

        {budget && <BudgetLinkCard {...budget} />}

        {view.parts.length > 0 && (
          <section aria-labelledby="place-parts" className="space-y-6">
            <h2 id="place-parts" className="headline text-2xl text-fg-primary">
              {t("parts.title", { place: view.name })}
            </h2>
            {view.parts.map((group) => (
              <div key={group.levelName} className="space-y-3">
                <h3 className="text-sm font-semibold text-fg-secondary">
                  {t("parts.level", { level: group.levelName, count: group.places.length })}
                </h3>
                <ul className="grid overflow-hidden rounded-surface border border-default bg-surface-base sm:grid-cols-2">
                  {group.places.map((place, i) => (
                    <li key={`${place.slugPath}-${i}`} className="-mb-px border-b border-default">
                      {place.slugPath ? (
                        <Link
                          href={placeHref(place.slugPath)}
                          className="flex min-h-11 items-center justify-between gap-3 px-5 py-2 text-fg-primary hover:bg-surface-raised"
                        >
                          <span>{place.name}</span>
                          <span aria-hidden className="text-fg-tertiary">
                            →
                          </span>
                        </Link>
                      ) : (
                        <span className="flex min-h-11 items-center px-5 py-2 text-fg-primary">
                          {place.name}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
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

        <section
          aria-labelledby="place-tax"
          className="rounded-surface border border-default bg-surface-base p-5 sm:p-6"
        >
          <h2 id="place-tax" className="mb-2 font-semibold text-fg-primary">
            {t("tax.title")}
          </h2>
          <p className="text-sm text-fg-secondary">
            {view.takesTax === null
              ? // A country of the world pack is its own subject; the pack is the whole world.
                t("tax.noModel", { pack: view.packKey === WORLD_PACK ? view.name : view.packName })
              : view.takesTax
                ? t("tax.levies", { pack: view.packName })
                : t("tax.none")}
          </p>
          {view.refinedBy.length > 0 && (
            <p className="mt-2 text-sm text-fg-secondary">
              {t("tax.dependsOn", { place: view.name })}
            </p>
          )}
          {view.takesTax !== null && (
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
              <Link href={taxHref} className="text-fg-primary hover:underline">
                {t("tax.open", { pack: view.packName })} →
              </Link>
              <Link href={compareHref([view.slugPath])} className="text-fg-primary hover:underline">
                {t("compareLink")}
              </Link>
            </div>
          )}
        </section>

        {view.actions.length > 0 && (
          <section
            aria-labelledby="place-actions"
            className="rounded-surface border border-default bg-surface-base p-5 sm:p-6"
          >
            <h2 id="place-actions" className="mb-1 font-semibold text-fg-primary">
              {t("actions.title")}
            </h2>
            <p className="mb-4 text-sm text-fg-secondary">{t("actions.intro")}</p>
            <ActionList
              actions={view.actions}
              due={(date) => t("actions.due", { date })}
              dueSource={t("actions.dueSource")}
            />
            <CalendarButton actions={view.actions} />
          </section>
        )}

        {view.lawAuthorities && view.lawAuthorities.length > 0 && (
          <div>
            <LawChat
              scope={{ place: view.name, authorities: view.lawAuthorities, topic: "tax" }}
              title={t("ask.title", { place: view.name })}
              placeholder={t("ask.placeholder")}
              storeKey={`solon-tax:${view.slugPath}`}
              starters={[t("ask.starters.one"), t("ask.starters.two"), t("ask.starters.three")]}
            />
          </div>
        )}

        <details className="rounded-surface border border-default bg-surface-base p-5 text-sm sm:p-6">
          <summary className="cursor-pointer font-semibold text-fg-primary">
            {t("record.title")}
          </summary>
          <div className="mt-4 space-y-6">
            <p className="text-fg-secondary">
              {t("official")}: {t("officialNote")}
            </p>
            {(view.otherNames.length > 0 || view.identifiers.length > 0) && (
              <dl className="space-y-2">
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
                      <a
                        href={id.url}
                        className="font-mono hover:underline"
                        rel="noopener noreferrer"
                      >
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
            <SourceList sources={view.sources} t={t} />
          </div>
        </details>
      </div>
    </ProfileFrame>
  );
}
