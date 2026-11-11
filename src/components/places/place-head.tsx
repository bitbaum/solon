import { Link } from "@/i18n/navigation";
import type { PlaceLink } from "@/lib/places/place-view";
import type { PlaceLaw } from "@/lib/law/place-law";
import { lawRowText } from "@/lib/law/place-law-row";
import type { PlacesTranslator } from "./translator";
import { WORLD_PACK } from "@/lib/config/places/countries/world";

/**
 * Where a place sits, from the world down to its parent: the first line of
 * every place page, so a reader landing from a shared link knows where they
 * are and can go up a level.
 */
export function PlaceTrail({ above, t }: { above: readonly PlaceLink[]; t: PlacesTranslator }) {
  return (
    <nav aria-label={t("partOf")} className="min-w-0">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <li>
          <Link href="/places/world" className="text-fg-secondary hover:underline">
            {t("world.title")}
          </Link>
        </li>
        {/* The world pack's root is the world itself, already the first crumb. */}
        {above
          .filter((place) => place.slugPath !== WORLD_PACK)
          .map((place, i) => (
            <li key={`${place.slugPath}-${i}`} className="flex items-center gap-2">
              <span aria-hidden className="text-fg-tertiary">
                ›
              </span>
              {place.slugPath ? (
                <Link
                  href={`/places/${place.slugPath}`}
                  className="text-fg-secondary hover:underline"
                >
                  {place.name}
                </Link>
              ) : (
                <span className="text-fg-secondary">{place.name}</span>
              )}
            </li>
          ))}
      </ol>
    </nav>
  );
}

/** The law that applies here, nearest first, each a way into reading it. */
export function PlaceLawCard({
  law,
  name,
  t,
}: {
  law: readonly PlaceLaw[];
  name: string;
  t: PlacesTranslator;
}) {
  return (
    <section
      aria-labelledby="place-law"
      className="rounded-surface border border-default bg-surface-base"
    >
      <div className="p-5 sm:p-6">
        <h2 id="place-law" className="font-semibold text-fg-primary">
          {t("law.title")}
        </h2>
        <p className="mt-1 text-sm text-fg-secondary">
          {law.length > 0 ? t("law.intro", { place: name }) : t("law.none", { place: name })}
        </p>
      </div>
      {law.length > 0 && (
        <ul className="divide-y divide-default border-t border-default">
          {law.map((authority) => (
            <LawRow key={authority.key} authority={authority} t={t} />
          ))}
        </ul>
      )}
      {law.map(
        (authority) =>
          authority.parts &&
          authority.parts.length > 0 && (
            <div key={`${authority.key}-parts`} className="border-t border-default">
              <h3 className="px-5 pt-4 text-sm font-semibold text-fg-secondary sm:px-6">
                {t("law.below", { count: authority.parts.length })}
              </h3>
              <ul className="mt-2 divide-y divide-default border-t border-default">
                {authority.parts.map((part) => (
                  <LawRow key={part.key} authority={part} t={t} />
                ))}
              </ul>
            </div>
          ),
      )}
    </section>
  );
}

/** One authority's law: its name, what Solon holds of it (and what it does not hold yet), a way into reading it. */
function LawRow({ authority, t }: { authority: PlaceLaw; t: PlacesTranslator }) {
  const { label, detail } = lawRowText(authority);
  return (
    <li>
      <Link
        href={`/law/place/${authority.key}`}
        className="flex min-h-11 items-center justify-between gap-3 px-5 py-3 hover:bg-surface-raised sm:px-6"
      >
        <span className="min-w-0">
          <span className="block font-medium text-fg-primary">{authority.name}</span>
          {detail && (
            <span className="block text-sm text-fg-tertiary">
              {t(`law.${detail.key}`, { count: detail.count })}
            </span>
          )}
        </span>
        <span className="shrink-0 text-sm text-fg-tertiary">
          {t(`law.${label.key}`, { count: label.count })} →
        </span>
      </Link>
    </li>
  );
}
