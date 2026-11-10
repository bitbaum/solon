import { Link } from "@/i18n/navigation";
import type { PlaceLink } from "@/lib/places/place-view";
import type { PlaceLaw } from "@/lib/law/place-law";
import ShareButton from "./share-button";
import type { PlacesTranslator } from "./place-profile";

/**
 * Where a place sits, from the world down to its parent, and the way to share
 * its page: the first line of every place page, so a reader landing from a
 * shared link knows where they are and can go up a level.
 */
export function PlaceTrail({
  above,
  name,
  t,
}: {
  above: readonly PlaceLink[];
  name: string;
  t: PlacesTranslator;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <nav aria-label={t("partOf")} className="min-w-0 flex-1">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <li>
            <Link href="/places/world" className="text-fg-secondary hover:underline">
              {t("world.title")}
            </Link>
          </li>
          {above.map((place, i) => (
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
      <ShareButton title={name} />
    </div>
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
            <li key={authority.key}>
              <Link
                href={`/law/place/${authority.key}`}
                className="flex min-h-11 items-center justify-between gap-3 px-5 py-3 hover:bg-surface-raised sm:px-6"
              >
                <span className="font-medium text-fg-primary">{authority.name}</span>
                <span className="text-sm text-fg-tertiary">
                  {t("law.count", { count: authority.acts })} →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
