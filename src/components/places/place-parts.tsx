import { Link } from "@/i18n/navigation";
import { placePhoto } from "@/lib/places/place-photo";
import type { PlaceView } from "@/lib/places/place-view";
import PlaceTile from "./place-tile";
import type { PlacesTranslator } from "./translator";

/** Past this many, a level's places are a list: a wall of two thousand communes is no way in. */
const MAX_TILES = 120;

/**
 * The places inside a place, level by level. A level whose places mostly have
 * a photograph is a wall of tiles, the same tile as the world's countries; any
 * other is the plain list, so a level never mixes the two.
 */
export default function PlaceParts({ view, t }: { view: PlaceView; t: PlacesTranslator }) {
  return (
    <section aria-labelledby="place-parts" className="space-y-6">
      <h2 id="place-parts" className="headline text-2xl text-fg-primary">
        {t("parts.title", { place: view.name })}
      </h2>
      {view.parts.map((group) => {
        const places = group.places.map((place) => ({
          ...place,
          photo: placePhoto(place.refs ?? []),
        }));
        const tiles =
          places.length <= MAX_TILES &&
          places.filter((p) => p.photo).length * 2 >= places.length &&
          places.every((p) => p.slugPath);
        return (
          <div key={group.levelName} className="space-y-3">
            <h3 className="text-sm font-semibold text-fg-secondary">
              {t("parts.level", { level: group.levelName, count: group.places.length })}
            </h3>
            {tiles ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {places.map((place, i) => (
                  <li key={`${place.slugPath}-${i}`} className="min-w-0">
                    <PlaceTile
                      href={`/places/${place.slugPath}`}
                      photo={place.photo}
                      name={place.name}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="grid overflow-hidden rounded-surface border border-default bg-surface-base sm:grid-cols-2">
                {places.map((place, i) => (
                  <li key={`${place.slugPath}-${i}`} className="-mb-px border-b border-default">
                    {place.slugPath ? (
                      <Link
                        href={`/places/${place.slugPath}`}
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
            )}
          </div>
        );
      })}
    </section>
  );
}
