import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { PlacePhoto } from "@/lib/places/place-photo";
import { photoUrl } from "@/lib/places/photo-store";

/**
 * A place as a tile: its photograph, what kind of place it is, its name and a
 * short note. One shape for every list of places, the world's countries and a
 * country's cantons alike; a place with no photograph keeps the same frame.
 */
export default function PlaceTile({
  href,
  photo,
  kicker,
  name,
  note,
}: {
  href: string;
  photo: PlacePhoto | null;
  /** What kind of place it is, where the list around it does not say. */
  kicker?: string;
  name: string;
  note?: string;
}) {
  return (
    <Link
      href={href}
      className="dark group relative flex aspect-[4/3] items-end overflow-hidden rounded-surface border border-default bg-surface-raised"
    >
      {photo && (
        <Image
          src={photoUrl(photo, 960)}
          alt=""
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          style={{ objectPosition: photo.position ?? "center 40%" }}
        />
      )}
      <div className="scrim absolute inset-0" aria-hidden="true" />
      <div className="relative w-full p-3 sm:p-4">
        {kicker && (
          <span className="block truncate text-xs uppercase tracking-wider text-fg-tertiary">
            {kicker}
          </span>
        )}
        <span className="block font-semibold text-fg-primary [overflow-wrap:anywhere]">{name}</span>
        <span className="block min-h-5 text-xs text-fg-secondary">{note}</span>
      </div>
    </Link>
  );
}
