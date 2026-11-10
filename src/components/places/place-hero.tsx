import Image from "next/image";
import type { PlacePhoto } from "@/lib/places/place-photo";

export interface PlaceHeroFact {
  label: string;
  value: string;
}

/**
 * The top of a place's page: its photograph across the width, its name, what
 * kind of place it is and a few facts, the photograph's author and licence in
 * the corner. The same for a country, a state, a canton or a proclaimed state:
 * a place with a photograph gets it, any other place keeps the plain title.
 *
 * Always in the dark theme: a photograph is light or dark whatever the reader
 * chose, and the scrim carries the text.
 */
export default function PlaceHero({
  photo,
  kicker,
  title,
  line,
  facts,
  credit,
}: {
  photo: PlacePhoto;
  kicker: string;
  title: string;
  line?: string | null;
  facts: readonly PlaceHeroFact[];
  /** "Photo: {author} · {license}", in the reader's language. */
  credit: string;
}) {
  const banner = photo.shape === "banner";
  return (
    <section
      className={`dark relative flex items-end overflow-hidden bg-surface-page ${
        banner ? "min-h-[46svh]" : "min-h-[72svh]"
      }`}
    >
      <Image
        src={photo.src}
        alt={title}
        fill
        priority
        sizes="100vw"
        className="object-cover"
        style={{ objectPosition: photo.position ?? "center 40%" }}
      />
      <div className="scrim-strong absolute inset-0" aria-hidden="true" />
      <div className="section-shell relative w-full pb-12 pt-32 md:pb-16">
        <div className="kicker">{kicker}</div>
        <h1 className="headline mt-4 max-w-4xl text-4xl text-fg-primary sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        {line && <p className="mb-0 mt-4 max-w-2xl text-lg text-fg-secondary">{line}</p>}
        {facts.length > 0 && (
          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
            {facts.map((f) => (
              <div key={f.label} className="min-w-0">
                <dt className="text-xs uppercase tracking-wider text-fg-tertiary">{f.label}</dt>
                <dd className="mb-0 mt-1 text-lg text-fg-primary">{f.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      <a
        href={photo.page}
        className="absolute bottom-2 right-3 max-w-[70%] truncate text-xs text-fg-tertiary hover:text-fg-secondary"
        rel="noopener noreferrer"
      >
        {credit}
      </a>
    </section>
  );
}
